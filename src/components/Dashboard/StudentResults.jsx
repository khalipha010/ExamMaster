import { useState, useEffect, useContext } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner, FaClipboardList } from 'react-icons/fa';
import { FiBarChart2, FiPieChart, FiAward,FiClock, FiCalendar, FiPercent, FiX, FiRefreshCw } from 'react-icons/fi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ThemeContext } from '../../context/ThemeContext';
import ThemeToggle from '../UI/ThemeToggle';

const StudentResults = ({ role }) => {
  const [results, setResults] = useState([]);
  const [pendingResults, setPendingResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [averageScore, setAverageScore] = useState(0);
  const { theme } = useContext(ThemeContext);

  const fetchResults = async (user) => {
    try {
      setLoading(true);
      setError('');
      
      if (!user) throw new Error('User not authenticated');
      if (role !== 'student') throw new Error('Unauthorized access');

      const resultsQuery = query(collection(db, 'examResults'), where('studentId', '==', user.uid));
      const querySnapshot = await getDocs(resultsQuery);
      const approvedResultsData = [];
      let totalScore = 0;
      let totalExams = 0;
      let pendingCount = 0;

      for (const resultDoc of querySnapshot.docs) {
        const result = resultDoc.data();
        const examRef = doc(db, 'exams', result.examId);
        const examDoc = await getDoc(examRef);
        const examTitle = examDoc.exists() ? examDoc.data().title : 'Unknown Exam';
        const subject = examTitle.split(' - ')[0] || examTitle;
        const percentage = ((result.score / result.totalQuestions) * 100).toFixed(2);

        if (result.approved) {
          approvedResultsData.push({
            id: resultDoc.id,
            examTitle,
            subject,
            score: result.score,
            totalQuestions: result.totalQuestions,
            percentage,
            submittedAt: result.submittedAt.toDate().toLocaleString(),
            submittedAtDate: result.submittedAt.toDate(),
          });
          totalScore += parseFloat(percentage);
          totalExams += 1;
        } else {
          pendingCount += 1;
        }
      }

      approvedResultsData.sort((a, b) => b.submittedAtDate - a.submittedAtDate);
      setResults(approvedResultsData);
      setPendingResults(pendingCount);
      setAverageScore(totalExams > 0 ? (totalScore / totalExams).toFixed(2) : 0);
    } catch (err) {
      setError('Failed to load results: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, fetchResults);
    return () => unsubscribe();
  }, [role]);

  const handleRetry = () => {
    setLoading(true);
    fetchResults(auth.currentUser);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="flex flex-col items-center"
        >
          <div className="relative w-12 h-12 mb-4">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i}
                className={`absolute w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'}`}
                style={{
                  top: '0',
                  left: '50%',
                  transform: `rotate(${i * 45}deg) translate(0, -18px)`
                }}
              />
            ))}
          </div>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          </p>
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
            <FiX className="text-red-500 text-2xl" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Error Loading Results
          </h3>
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <div className="flex gap-3 justify-center">
            <motion.button
              onClick={handleRetry}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiRefreshCw />
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

  const barChartData = results.map((result) => ({
    subject: result.subject,
    percentage: parseFloat(result.percentage),
    examTitle: result.examTitle,
    date: result.submittedAtDate.toLocaleDateString(),
  }));

  const subjectDistribution = results.reduce((acc, result) => {
    const existingSubject = acc.find((item) => item.name === result.subject);
    if (existingSubject) {
      existingSubject.value += 1;
      existingSubject.exams.push(result.examTitle);
    } else {
      acc.push({
        name: result.subject,
        value: 1,
        exams: [result.examTitle],
        color: getColorForSubject(acc.length),
      });
    }
    return acc;
  }, []);

  function getColorForSubject(index) {
    const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
    return colors[index % colors.length];
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className={`text-2xl md:text-3xl font-bold font-display ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
          </h1>
          <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Track your academic performance and progress
          </p>
        </motion.header>

        {results.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`rounded-xl shadow-sm p-8 text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
              <FaClipboardList className={`text-3xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h3 className={`text-xl font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {pendingResults > 0 ? 'Results Awaiting Approval' : 'No Approved Results Found'}
            </h3>
            <p className={`mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              {pendingResults > 0
                ? `You have ${pendingResults} result${pendingResults !== 1 ? 's' : ''} awaiting teacher approval.`
                : 'When your teacher approves your exam results, they will appear here.'}
            </p>
            {pendingResults > 0 && (
              <motion.button
                onClick={handleRetry}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 mx-auto ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiRefreshCw />
                Check for Updates
              </motion.button>
            )}
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`rounded-xl shadow-lg p-6 mb-8 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
            >
              <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                <FiAward className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /> 
                Performance Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Exams Taken', value: results.length, icon: <FaClipboardList /> },
                  { label: 'Average Score', value: `${averageScore}%`, icon: <FiPercent /> },
                  { label: 'Highest Score', value: `${Math.max(...results.map((r) => parseFloat(r.percentage)))}%`, icon: <FiAward /> },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * idx, duration: 0.3 }}
                    className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                        {stat.icon}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {stat.label}
                        </p>
                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {pendingResults > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-3 rounded-lg bg-yellow-900/20 flex items-center gap-2"
                >
                  <FiClock className="text-yellow-400" />
                  <p className="text-sm text-yellow-400">
                    You have {pendingResults} result{pendingResults !== 1 ? 's' : ''} awaiting approval.
                  </p>
                </motion.div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`rounded-xl shadow-lg p-6 mb-8 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
            >
              <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                <FiBarChart2 className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /> 
                Performance by Subject
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis
                      dataKey="subject"
                      stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                      tick={{ fill: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}
                      angle={-45}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                      tick={{ fill: theme === 'dark' ? '#f3f4f6' : '#1f2937' }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                        borderRadius: '0.5rem',
                        color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                      }}
                      formatter={(value) => [`${value}%`, 'Score']}
                      labelFormatter={(subject) => {
                        const item = barChartData.find((d) => d.subject === subject);
                        return (
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            <div><strong>Subject:</strong> {subject}</div>
                            <div><strong>Exam:</strong> {item?.examTitle}</div>
                            <div><strong>Date:</strong> {item?.date}</div>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="percentage" 
                      name="Score (%)" 
                      fill={theme === 'dark' ? '#60a5fa' : '#3b82f6'} 
                      radius={[4, 4, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className={`rounded-xl shadow-lg p-6 mb-8 ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
            >
              <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                <FiPieChart className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /> 
                Subject Distribution
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                        borderRadius: '0.5rem',
                        color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
                      }}
                      formatter={(value, name) => [`${value} exams`, name]}
                      labelFormatter={(name) => {
                        const item = subjectDistribution.find((d) => d.name === name);
                        return (
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            <div><strong>Subject:</strong> {name}</div>
                            <div><strong>Exams:</strong> {item?.exams.join(', ')}</div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className={`rounded-xl shadow-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
            >
              <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`text-xl font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  <FiCalendar className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /> 
                  Exam Results
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                  <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                    <tr>
                      {['Subject', 'Exam', 'Score', 'Percentage', 'Date Taken'].map((header) => (
                        <th
                          key={header}
                          className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {results.map((result, index) => (
                      <motion.tr
                        key={result.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 * index }}
                        className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                          {result.subject}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {result.examTitle}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          {result.score}/{result.totalQuestions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              parseFloat(result.percentage) >= 80
                                ? theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-800'
                                : parseFloat(result.percentage) >= 60
                                ? theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-800'
                                : parseFloat(result.percentage) >= 40
                                ? theme === 'dark' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                                : theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {result.percentage}%
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {result.submittedAt}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
      <ThemeToggle />
    </div>
  );
};

export default StudentResults;