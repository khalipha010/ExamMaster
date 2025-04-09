import { useState, useEffect, useContext } from 'react'; // Import React hooks from 'react'
import { Routes, Route, useLocation, useParams } from 'react-router-dom'; // Import routing hooks from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../../context/ThemeContext';
import Sidebar from './Sidebar';
import ProfileUpdate from '../Profile/ProfileUpdate';
import ExamListForStudents from '../Exam/ExamListForStudents';
import TakeExam from '../Exam/TakeExam';
import StudentResults from './StudentResults';
import Notifications from './Notifications';
import ThemeToggle from '../UI/ThemeToggle';
import { FiBell, FiHome, FiUser, FiBook, FiAward } from 'react-icons/fi';
import { auth, db } from '../../firebase/config';
import { collection, getDocs, query, doc, getDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Animation variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  in: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  out: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

// TakeExamWrapper as a standalone component
const TakeExamWrapper = () => {
  const { examId } = useParams();
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      className="p-4 lg:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <FiBook className="text-[var(--accent)]" />
          Take Exam
        </h1>
      </div>
      <TakeExam examId={examId} role="student" />
    </motion.div>
  );
};

const StudentDashboard = () => {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const [newCount, setNewCount] = useState(0);
  const [viewedAnnouncements, setViewedAnnouncements] = useState(new Set());
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(new Set());

  useEffect(() => {
    console.log('Firebase db in StudentDashboard:', db);
    if (!db) {
      console.error('Firestore db is not initialized');
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const allAnnouncementsQuery = query(
            collection(db, 'announcements'),
            where('target', '==', 'all')
          );
          const allAnnouncementsSnapshot = await getDocs(allAnnouncementsQuery);

          const targetedAnnouncementsQuery = query(
            collection(db, 'announcements'),
            where('target', 'array-contains', user.uid)
          );
          const targetedAnnouncementsSnapshot = await getDocs(targetedAnnouncementsQuery);

          const announcementList = [
            ...allAnnouncementsSnapshot.docs,
            ...targetedAnnouncementsSnapshot.docs,
          ]
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((ann, index, self) => index === self.findIndex((a) => a.id === ann.id));

          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();
          if (userData) {
            const viewed = new Set(userData.viewedAnnouncements || []);
            const dismissed = new Set(userData.dismissedAnnouncements || []);
            setViewedAnnouncements(viewed);
            setDismissedAnnouncements(dismissed);

            const count = announcementList.filter(
              (ann) => !viewed.has(ann.id) && !dismissed.has(ann.id)
            ).length;
            setNewCount(count);
          }
        } catch (err) {
          console.error('Failed to fetch newCount:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar role="student" />
      <div className="flex-1 p-4 md:p-6 lg:p-8 ml-0 md:ml-64 transition-all duration-300 w-full">
        <div className="md:hidden flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Student Portal
          </h1>
        </div>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                >
                  <div className="hidden md:flex items-center justify-between mb-6 lg:mb-8">
                    <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                      <FiHome className="text-[var(--accent)]" />
                      Student Dashboard
                    </h1>
                  </div>
                  <ExamListForStudents role="student" />
                </motion.div>
              }
            />
            <Route
              path="/profile"
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                      <FiUser className="text-[var(--accent)]" />
                      Profile Settings
                    </h1>
                  </div>
                  <ProfileUpdate role="student" />
                </motion.div>
              }
            />
            <Route path="/take-exam/:examId" element={<TakeExamWrapper />} />
            <Route
              path="/results"
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                      <FiAward className="text-[var(--accent)]" />
                      Exam Results
                    </h1>
                  </div>
                  <StudentResults role="student" />
                </motion.div>
              }
            />
            <Route
              path="/notifications"
              element={
                <motion.div
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <FiBell className="text-[var(--accent)]" />
                        Notifications
                      </h1>
                      {newCount > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-500 text-white md:hidden">
                          {newCount} New
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6">
                      <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {/* This will be updated by Notifications.jsx */}
                      </p>
                      <ThemeToggle />
                    </div>
                  </div>
                  <Notifications role="student" />
                </motion.div>
              }
            />
          </Routes>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentDashboard;