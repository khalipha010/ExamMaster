import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { motion } from 'framer-motion';
import { ThemeContext } from '../../context/ThemeContext';
import { FaPause, FaPlay, FaSpinner, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ThemeToggle from '../UI/ThemeToggle';

const TakeExam = ({ examId, role }) => {
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasTakenExam, setHasTakenExam] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [savedProgress, setSavedProgress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [isRetake, setIsRetake] = useState(false);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    console.log('TakeExam mounted with examId:', examId, 'role:', role);
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log('No user authenticated');
        setError('User is not authenticated. Please log in.');
        setLoading(false);
        navigate('/');
        return;
      }

      if (role !== 'student') {
        console.log('Role check failed:', role);
        setError('You do not have permission to access this exam.');
        setLoading(false);
        return;
      }

      console.log('User authenticated:', user.uid);

      // Force token refresh
      try {
        await user.getIdToken(true);
        console.log('Auth token refreshed');
      } catch (err) {
        console.error('Token refresh failed:', err);
        setError('Failed to authenticate: ' + err.message);
        setLoading(false);
        return;
      }

      const loadingTimeout = setTimeout(() => {
        if (loading) {
          setError('Loading timed out. Please try again.');
          setLoading(false);
        }
      }, 10000);

      try {
        console.log('Fetching exam...');
        const examRef = doc(db, 'exams', examId);
        const examDoc = await getDoc(examRef);
        if (!examDoc.exists()) {
          console.log('Exam document does not exist');
          setError('Exam not found.');
          setLoading(false);
          clearTimeout(loadingTimeout);
          return;
        }
        const examData = examDoc.data();
        console.log('Exam data loaded:', examData);
        setExam(examData);

        console.log('Checking exam results...');
        const resultRef = doc(db, 'examResults', `${examId}_${user.uid}`);
        const resultDoc = await getDoc(resultRef);
        let canRetake = false;
        let hasResult = resultDoc.exists();

        if (hasResult) {
          const resultData = resultDoc.data();
          canRetake = resultData.retakeAllowed === true;
        } else {
          const q = query(
            collection(db, 'examResults'),
            where('examId', '==', examId),
            where('studentId', '==', user.uid)
          );
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            hasResult = true;
            querySnapshot.forEach((doc) => {
              if (doc.data().retakeAllowed === true) canRetake = true;
            });
          }
        }

        if (hasResult) {
          if (canRetake) {
            console.log('Retake allowed, clearing previous results');
            setIsRetake(true);
            const deletePromises = [];
            if (resultDoc.exists()) deletePromises.push(deleteDoc(resultRef));
            const q = query(
              collection(db, 'examResults'),
              where('examId', '==', examId),
              where('studentId', '==', user.uid)
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.docs.forEach((doc) => deletePromises.push(deleteDoc(doc.ref)));
            await Promise.all(deletePromises);
          } else if (!isSubmittingExam) {
            console.log('Exam already taken, no retake allowed');
            setHasTakenExam(true);
            setLoading(false);
            clearTimeout(loadingTimeout);
            return;
          }
        } else {
          setHasTakenExam(false);
          setIsRetake(false);
        }

        console.log('Checking progress...');
        const progressRef = doc(db, 'examProgress', `${user.uid}_${examId}`);
        const progressDoc = await getDoc(progressRef);
        if (!isRetake && !hasResult && progressDoc.exists()) {
          const progressData = progressDoc.data();
          const examUpdatedAt = examData.updatedAt?.toDate().getTime() || 0;
          const progressUpdatedAt = progressData.updatedAt?.toDate().getTime() || 0;
          if (examUpdatedAt > progressUpdatedAt) {
            console.log('Exam updated, resetting progress');
            await deleteDoc(progressRef);
            setAnswers(new Array(examData.questions.length).fill(''));
            setCurrentQuestionIndex(0);
            setTimeLeft(examData.timer * 60);
          } else {
            console.log('Loading saved progress:', progressData);
            setSavedProgress(progressData);
            setAnswers(progressData.answers);
            setCurrentQuestionIndex(progressData.currentQuestionIndex);
            setTimeLeft(progressData.timeLeft);
          }
        } else {
          console.log('No saved progress or fresh start/retake');
          setAnswers(new Array(examData.questions.length).fill(''));
          setCurrentQuestionIndex(0);
          setTimeLeft(examData.timer * 60);
          setSavedProgress(null);
        }

        setLoading(false);
        clearTimeout(loadingTimeout);

        const unsubscribeResults = onSnapshot(resultRef, (docSnapshot) => {
          console.log('Real-time result update:', docSnapshot.exists());
          if (docSnapshot.exists() && !isSubmittingExam && !docSnapshot.data().retakeAllowed) {
            setHasTakenExam(true);
          }
        }, (err) => {
          console.error('Snapshot error:', err);
        });

        return () => unsubscribeResults();
      } catch (err) {
        console.error('Error loading exam:', err);
        if (err.code === 'permission-denied') {
          setError('Failed to load exam: You do not have permission to access this exam.');
        } else {
          setError('Failed to load exam: ' + err.message);
        }
        setLoading(false);
        clearTimeout(loadingTimeout);
      }
    });

    return () => unsubscribeAuth();
  }, [examId, navigate, role]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || hasTakenExam || isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isSubmitting) handleSubmit(true);
          return 0;
        }
        if (prev <= 30 && prev > 29) {
          new Audio('https://www.soundjay.com/buttons/beep-01a.mp3')
            .play()
            .catch((err) => console.error('Audio error:', err));
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, hasTakenExam, isPaused, isSubmitting]);

  useEffect(() => {
    if (!exam || !auth.currentUser || hasTakenExam || timeLeft === null || isRetake) return;

    const saveProgress = async () => {
      try {
        const progressRef = doc(db, 'examProgress', `${auth.currentUser.uid}_${examId}`);
        await setDoc(progressRef, {
          examId,
          studentId: auth.currentUser.uid,
          answers,
          currentQuestionIndex,
          timeLeft,
          updatedAt: new Date(),
        }, { merge: true });
      } catch (err) {
        console.error('Error saving progress:', err);
      }
    };

    saveProgress();
  }, [answers, currentQuestionIndex, timeLeft, exam, examId, hasTakenExam, isRetake]);

  const handleAnswerChange = (index, value) => {
    const updatedAnswers = [...answers];
    updatedAnswers[index] = value;
    setAnswers(updatedAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleSubmit = async (autoSubmit = false, retryCount = 0) => {
    if (!exam || isSubmitting) return;

    if (!autoSubmit && !showSubmitConfirm) {
      setShowSubmitConfirm(true);
      return;
    }

    setShowSubmitConfirm(false);
    setLoading(true);
    setError('');
    setSubmissionError('');
    setIsSubmitting(true);
    setIsSubmittingExam(true);

    let calculatedScore = 0;
    try {
      exam.questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswer) calculatedScore += 1;
      });

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated.');

      const resultData = {
        examId,
        studentId: user.uid,
        answers,
        score: calculatedScore,
        totalQuestions: exam.questions.length,
        submittedAt: new Date(),
        class: exam.class,
        teacherId: exam.teacherId,
        retakeAllowed: false,
        approved: false,
      };

      const resultRef = doc(db, 'examResults', `${examId}_${user.uid}`);
      await setDoc(resultRef, resultData);

      const progressRef = doc(db, 'examProgress', `${user.uid}_${examId}`);
      await deleteDoc(progressRef);
    } catch (err) {
      console.error('Submission error:', err);
      if (autoSubmit && retryCount < 1 && err.code === 'permission-denied') {
        setTimeout(() => handleSubmit(true, retryCount + 1), 2000);
        return;
      }
     // setSubmissionError('Failed to save results: ' + err.message);
    } finally {
      setScore(calculatedScore);
      setShowResults(true);
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const closeResultsPopup = () => {
    setShowResults(false);
    setIsSubmittingExam(false);
    navigate('/student-dashboard', { state: { notification: submissionError || 'Exam submitted successfully!' } });
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-bg)] text-[var(--text-primary)] p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Unauthorized Access</h2>
          <p>You don't have permission to view this exam.</p>
        </div>
      </div>
    );
  }

   if (loading) {
       return (
         <div className="min-h-screen flex items-center justify-center bg-[var(--primary-bg)]">
           <motion.div
             animate={{ rotate: 360 }}
             transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
           >
             <div className="relative w-8 h-8">
               {[...Array(8)].map((_, i) => (
                 <div 
                   key={i}
                   className="absolute w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                   style={{
                     top: '0',
                     left: '50%',
                     transform: `rotate(${i * 45}deg) translate(0, -12px)`
                   }}
                 />
               ))}
             </div>
           </motion.div>
         </div>
       );
     }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--primary-bg)] p-4 text-center">
        <div className="bg-[var(--secondary-bg)] p-6 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Error Loading Exam</h2>
          <p className="text-[var(--text-secondary)] mb-6">{error}</p>
          <button
            onClick={() => navigate('/student-dashboard')}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (hasTakenExam && !showResults) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--primary-bg)] p-4 text-center">
        <div className="bg-[var(--secondary-bg)] p-6 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Exam Completed</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            You have already taken this exam. Check your results in the dashboard.
          </p>
          <button
            onClick={() => navigate('/student-dashboard/results')}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--primary-bg)] p-4 text-center">
        <div className="bg-[var(--secondary-bg)] p-6 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Exam Not Found</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            The requested exam could not be loaded. It may have been removed.
          </p>
          <button
            onClick={() => navigate('/student-dashboard')}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--primary-bg)] p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-4xl mx-auto bg-[var(--secondary-bg)] rounded-xl shadow-lg overflow-hidden"
      >
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                {exam.title}
              </h1>
              <p className="text-[var(--text-secondary)]">
                Class: {exam.class}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`text-lg font-medium ${
                timeLeft <= 30 && timeLeft > 0 ? 'text-red-500 animate-pulse' : ''
              }`}>
                Time: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
              </div>
              <motion.button
                onClick={togglePause}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPaused ? <FaPlay /> : <FaPause />}
                <span className="hidden sm:inline">{isPaused ? 'Resume' : 'Pause'}</span>
              </motion.button>
            </div>
          </div>
        </div>
        <div className="px-6 pt-4 pb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[var(--text-secondary)]">
              Question {currentQuestionIndex + 1} of {exam.questions.length}
            </span>
            <span className="text-sm font-medium text-[var(--accent)]">
              {Math.round(((currentQuestionIndex + 1) / exam.questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-[var(--accent)] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
            />
          </div>
        </div>
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="p-6"
        >
          <div className="mb-6 p-4 bg-[var(--primary-bg)] rounded-lg border border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              {exam.questions[currentQuestionIndex].text}
            </h3>
            {exam.questions[currentQuestionIndex].imageUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={exam.questions[currentQuestionIndex].imageUrl}
                  alt="Question"
                  className="max-w-full h-auto max-h-64 rounded-lg border border-[var(--border)]"
                />
              </div>
            )}
            <div className="space-y-3">
              {exam.questions[currentQuestionIndex].options.map((option, oIndex) => {
                const optionLetter = String.fromCharCode(65 + oIndex);
                return (
                  <label
                    key={oIndex}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      answers[currentQuestionIndex] === optionLetter
                        ? 'bg-[var(--accent)]/10 border border-[var(--accent)]'
                        : 'bg-[var(--secondary-bg)] hover:bg-[var(--primary-bg)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={optionLetter}
                      checked={answers[currentQuestionIndex] === optionLetter}
                      onChange={() => handleAnswerChange(currentQuestionIndex, optionLetter)}
                      className="mt-1 flex-shrink-0"
                      disabled={isPaused}
                    />
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">
                        {optionLetter}. 
                      </span>
                      <span className="ml-2 text-[var(--text-primary)]">
                        {option}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <motion.button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || isPaused}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                currentQuestionIndex === 0 || isPaused
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-[var(--accent)] hover:bg-blue-600 text-white'
              } transition-colors`}
              whileHover={{ scale: currentQuestionIndex === 0 || isPaused ? 1 : 1.03 }}
            >
              <FaChevronLeft />
              <span>Previous</span>
            </motion.button>
            <div className="flex gap-3">
              {currentQuestionIndex < exam.questions.length - 1 ? (
                <motion.button
                  onClick={handleNext}
                  disabled={isPaused}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-blue-600 text-white rounded-lg transition-colors"
                  whileHover={{ scale: 1.03 }}
                >
                  <span>Next</span>
                  <FaChevronRight />
                </motion.button>
              ) : null}
              <motion.button
                onClick={() => handleSubmit(false)}
                disabled={isPaused || isSubmitting}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.03 }}
              >
                {isSubmitting ? (
                  <FaSpinner className="animate-spin" />
                ) : null}
                Submit Exam
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--secondary-bg)] rounded-xl shadow-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
              Confirm Submission
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Are you sure you want to submit your exam? You won't be able to make changes after submission.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                onClick={() => handleSubmit(true)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                whileHover={{ scale: 1.03 }}
              >
                Submit Now
              </motion.button>
              <motion.button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                whileHover={{ scale: 1.03 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
      {showResults && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[var(--secondary-bg)] rounded-xl shadow-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)] text-center">
              Exam Submitted
            </h3>
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-[var(--accent)] mb-2">
                {score}/{exam.questions.length}
              </p>
              <p className="text-xl text-[var(--text-primary)]">
                {((score / exam.questions.length) * 100).toFixed(1)}%
              </p>
              {score === exam.questions.length && (
                <p className="text-green-500 mt-2">Perfect score! 🎉</p>
              )}
            </div>
            <p className="text-[var(--text-secondary)] text-center mb-6">
              Your results are pending teacher approval.
            </p>
            {submissionError && (
              <p className="text-red-500 text-center mb-4">{submissionError}</p>
            )}
            <motion.button
              onClick={closeResultsPopup}
              className="w-full px-4 py-2 bg-[var(--accent)] hover:bg-blue-600 text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.03 }}
            >
              Return to Dashboard
            </motion.button>
          </motion.div>
        </div>
      )}
      <ThemeToggle />
    </div>
  );
};

export default TakeExam;