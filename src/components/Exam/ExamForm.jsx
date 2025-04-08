import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { doc, setDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../../context/ThemeContext';
import { FiTrash2, FiPlus, FiCheck, FiUpload, FiEdit2 } from 'react-icons/fi';
import ThemeToggle from '../UI/ThemeToggle';

const ExamForm = ({ examId, role }) => {
  const [formData, setFormData] = useState({
    title: '',
    class: '',
    timer: '',
    questions: [{ text: '', image: null, imageUrl: null, options: ['', '', '', ''], correctAnswer: '' }],
  });
  const [teacherId, setTeacherId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const classes = Array.from({ length: 12 }, (_, i) => `Basic ${i + 1}`);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (auth.currentUser) {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            setTeacherId(userDoc.data().teacherId);
          } else {
            setError('User data not found.');
            setLoading(false);
            return;
          }
        } else {
          setError('User not authenticated.');
          setLoading(false);
          return;
        }

        if (examId) {
          const examDoc = await getDoc(doc(db, 'exams', examId));
          if (examDoc.exists()) {
            const data = examDoc.data();
            const questions =
              data.questions && data.questions.length > 0
                ? data.questions.map((q) => ({
                    text: q.text || '',
                    image: null,
                    imageUrl: q.imageUrl || null,
                    options: q.options && q.options.length === 4 ? q.options : ['', '', '', ''],
                    correctAnswer: q.correctAnswer || '',
                  }))
                : [{ text: '', image: null, imageUrl: null, options: ['', '', '', ''], correctAnswer: '' }];
            setFormData({
              title: data.title || '',
              class: data.class || '',
              timer: data.timer ? data.timer.toString() : '',
              questions,
            });
          } else {
            setError('Exam not found.');
          }
        }
      } catch (err) {
        setError('Failed to load exam data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index][field] = value;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[qIndex].options[oIndex] = value;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const handleImageChange = (index, file) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index].image = file;
    updatedQuestions[index].imageUrl = file ? URL.createObjectURL(file) : updatedQuestions[index].imageUrl;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        { text: '', image: null, imageUrl: null, options: ['', '', '', ''], correctAnswer: '' },
      ],
    });
  };

  const removeQuestion = (index) => {
    const updatedQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const questionsWithImages = await Promise.all(
        formData.questions.map(async (question) => {
          if (question.image) {
            const imageUrl = await uploadImageToCloudinary(question.image, 'exam_pictures');
            return { ...question, imageUrl, image: null };
          }
          return { ...question, image: null };
        })
      );
      const examData = {
        title: formData.title,
        class: formData.class,
        teacherId,
        timer: parseInt(formData.timer),
        questions: questionsWithImages,
        createdAt: new Date(),
      };
      if (examId) {
        await setDoc(doc(db, 'exams', examId), examData, { merge: true });
      } else {
        await addDoc(collection(db, 'exams'), examData);
      }
      navigate('/teacher-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-bg)] text-[var(--text-primary)]">
        Unauthorized
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-bg)] text-[var(--text-primary)]">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl mx-auto bg-[var(--secondary-bg)] rounded-xl shadow-lg border border-[var(--border)] overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[var(--text-primary)] mb-6 font-display">
            {examId ? 'Edit Exam' : 'Create New Exam'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['title', 'class', 'timer'].map((field, idx) => (
                <motion.div
                  key={field}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                  className={field === 'title' ? 'md:col-span-2' : ''}
                >
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2 capitalize">
                    {field === 'timer' ? 'Duration (mins)' : field}
                  </label>
                  {field === 'class' ? (
                    <select
                      name="class"
                      value={formData.class}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[var(--primary-bg)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-[var(--text-primary)]"
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map((className) => (
                        <option key={className} value={className}>
                          {className}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field === 'timer' ? 'number' : 'text'}
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      placeholder={field === 'timer' ? 'Exam duration in minutes' : `Enter ${field}`}
                      className="w-full px-4 py-3 bg-[var(--primary-bg)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                      required
                      min={field === 'timer' ? '1' : undefined}
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Questions Section */}
            <div className="space-y-6">
              <AnimatePresence>
                {formData.questions.map((question, qIndex) => (
                  <motion.div
                    key={qIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-[var(--primary-bg)] p-5 rounded-lg border border-[var(--border)] shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                        Question {qIndex + 1}
                      </h3>
                      {formData.questions.length > 1 && (
                        <motion.button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Remove question"
                        >
                          <FiTrash2 />
                        </motion.button>
                      )}
                    </div>

                    <textarea
                      value={question.text}
                      onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                      placeholder="Enter question text..."
                      className="w-full px-4 py-3 mb-4 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] min-h-[100px]"
                      required
                    />

                    {/* Image Upload */}
                    <div className="mb-4">
                      <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                        <FiUpload />
                        <span>Question Image (Optional)</span>
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex-1 cursor-pointer">
                          <div className="px-4 py-2 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-lg hover:bg-[var(--primary-bg)] transition-colors text-center">
                            Choose File
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(qIndex, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                        {question.imageUrl && (
                          <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[var(--border)]">
                            <img
                              src={question.imageUrl}
                              alt="Question preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3 mb-4">
                      <label className="block text-sm font-medium text-[var(--text-primary)]">
                        Answer Options
                      </label>
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <div 
                            className="flex-shrink-0 w-5 h-5 rounded-full border border-[var(--border)] flex items-center justify-center cursor-pointer"
                            onClick={() => handleQuestionChange(qIndex, 'correctAnswer', option)}
                          >
                            {question.correctAnswer === option && (
                              <FiCheck className="text-green-500 text-xs" />
                            )}
                          </div>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${oIndex + 1}`}
                            className="flex-1 px-4 py-2 bg-[var(--secondary-bg)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                type="button"
                onClick={addQuestion}
                className="w-full px-6 py-3 bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg flex items-center justify-center gap-2 transition-colors"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiPlus />
                <span>Add Another Question</span>
              </motion.button>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-[var(--border)]">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-lg text-sm">
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  type="button"
                  onClick={() => navigate('/teacher-dashboard')}
                  className="px-6 py-3 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--primary-bg)] transition-colors"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="relative w-5 h-5">
                        {[...Array(8)].map((_, i) => (
                          <div 
                            key={i}
                            className="absolute w-1 h-1 rounded-full bg-white"
                            style={{
                              top: '0',
                              left: '50%',
                              transform: `rotate(${i * 45}deg) translate(0, -8px)`
                            }}
                          />
                        ))}
                      </div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {examId ? <FiEdit2 /> : <FiPlus />}
                      <span>{examId ? 'Update Exam' : 'Create Exam'}</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
      <ThemeToggle />
    </div>
  );
};

export default ExamForm;