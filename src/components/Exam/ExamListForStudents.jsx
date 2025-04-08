import { useState, useEffect, useContext } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaSpinner, FaClipboardList } from 'react-icons/fa';
import { FiClock, FiUsers, FiBookOpen } from 'react-icons/fi';
import { ThemeContext } from '../../context/ThemeContext';
import ThemeToggle from '../UI/ThemeToggle';

const ExamListForStudents = ({ role }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredExams, setFilteredExams] = useState([]);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        if (role !== 'student') throw new Error('Unauthorized access');

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) throw new Error('User data not found');

        const studentClass = userDoc.data().class;
        const q = query(collection(db, 'exams'), where('class', '==', studentClass));
        const querySnapshot = await getDocs(q);
        
        const examData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })).sort((a, b) => b.createdAt - a.createdAt);

        setExams(examData);
        setFilteredExams(examData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, fetchExams);
    return () => unsubscribe();
  }, [role]);

  useEffect(() => {
    if (searchTerm) {
      const results = exams.filter(exam => 
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.class.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredExams(results);
    } else {
      setFilteredExams(exams);
    }
  }, [searchTerm, exams]);

  const handleTakeExam = (examId) => {
    navigate(`/student-dashboard/take-exam/${examId}`);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
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
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-xl shadow-lg max-w-md text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100'}`}>
            <FaClipboardList className="text-red-500 text-2xl" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Error Loading Exams
          </h3>
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <div className="flex gap-3 justify-center">
            <motion.button
              onClick={() => window.location.reload()}
              className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Try Again
            </motion.button>
            <motion.button
              onClick={() => navigate('/student-dashboard')}
              className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              Back to Dashboard
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold font-display ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                Available Exams
              </h1>
              <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {exams.length} exam{exams.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
              <div className={`absolute left-3 top-2.5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.header>

        {filteredExams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`rounded-xl shadow-sm p-8 text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
              <FiBookOpen className={`text-3xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h3 className={`text-xl font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {searchTerm ? 'No matching exams found' : 'No Exams Available'}
            </h3>
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              {searchTerm ? 'Try a different search term' : 'No exams have been assigned to your class yet'}
            </p>
            {searchTerm && (
              <motion.button
                onClick={() => setSearchTerm('')}
                className={`mt-4 px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                Clear Search
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredExams.map((exam, index) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`rounded-xl shadow-sm hover:shadow-md transition-shadow ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className={`text-xl font-semibold truncate ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                        {exam.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                        {formatDate(exam.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center">
                        <FiUsers className={`mr-2 flex-shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Class: {exam.class}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FiClock className={`mr-2 flex-shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Duration: {exam.timer} minutes
                        </span>
                      </div>
                      <div className="flex items-center">
                        <FiBookOpen className={`mr-2 flex-shrink-0 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                        <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {exam.questions?.length || 0} question{exam.questions?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <motion.button
                      onClick={() => handleTakeExam(exam.id)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FaPlay />
                      <span>Start Exam</span>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <ThemeToggle />
    </div>
  );
};

export default ExamListForStudents;