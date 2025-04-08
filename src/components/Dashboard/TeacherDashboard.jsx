import { Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import Sidebar from './Sidebar';
import ProfileUpdate from '../Profile/ProfileUpdate';
import ExamList from '../Exam/ExamList';
import ExamForm from '../Exam/ExamForm';
import ExamResults from '../Exam/ExamResults';
import ExamStudents from '../Exam/ExamStudents';
import Announcements from '../../Announcements/Announcements'; // Import the new component
import ThemeToggle from '../UI/ThemeToggle';
import { FiBook, FiEdit2, FiBarChart2, FiUser, FiPlus, FiUsers, FiBell } from 'react-icons/fi';

const TeacherDashboard = () => {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();

  const EditExamWrapper = () => {
    const { examId } = useParams();
    return (
      <PageWrapper 
        title="Edit Exam" 
        icon={<FiEdit2 className="text-blue-500" />}
      >
        <ExamForm role="teacher" examId={examId} />
      </PageWrapper>
    );
  };

  const PageWrapper = ({ title, children, icon }) => (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="p-4 sm:p-6"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-8">
          {icon && (
            <div className="mr-4 p-3 rounded-lg bg-[var(--primary-bg)]">
              {icon}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] font-display">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </motion.div>
  );

  return (
    <div className={`flex min-h-screen bg-[var(--primary-bg)] transition-colors duration-300 ${
      theme === 'dark' ? 'dark:bg-gray-900' : ''
    }`}>
      <Sidebar role="teacher" />
      
      {/* Main Content Area */}
      <main className="flex-1 p-0 md:pl-64 transition-all duration-300">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageWrapper 
                  title="Teacher Dashboard" 
                  icon={<FiBook className="text-indigo-500" />}
                >
                  <ExamList role="teacher" />
                </PageWrapper>
              }
            />
            <Route
              path="/profile"
              element={
                <PageWrapper 
                  title="Edit Profile" 
                  icon={<FiUser className="text-purple-500" />}
                >
                  <ProfileUpdate role="teacher" />
                </PageWrapper>
              }
            />
            <Route
              path="/create-exam"
              element={
                <PageWrapper 
                  title="Create Exam" 
                  icon={<FiPlus className="text-green-500" />}
                >
                  <ExamForm role="teacher" examId={undefined} />
                </PageWrapper>
              }
            />
            <Route path="/edit-exam/:examId" element={<EditExamWrapper />} />
            <Route
              path="/results"
              element={
                <PageWrapper 
                  title="View Results" 
                  icon={<FiBarChart2 className="text-yellow-500" />}
                >
                  <ExamResults role="teacher" />
                </PageWrapper>
              }
            />
            <Route
              path="/students"
              element={
                <PageWrapper 
                  title="Exam Students" 
                  icon={<FiUsers className="text-teal-500" />}
                >
                  <ExamStudents role="teacher" />
                </PageWrapper>
              }
            />
            <Route
              path="/announcements"
              element={
                <PageWrapper 
                  title="Announcements" 
                  icon={<FiBell className="text-orange-500" />}
                >
                  <Announcements role="teacher" />
                </PageWrapper>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
      
      <ThemeToggle />
    </div>
  );
};

export default TeacherDashboard;