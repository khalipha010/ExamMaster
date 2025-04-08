import { useState, useEffect, useContext } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, getDocs, query, setDoc, doc, getDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { FaSpinner, FaClipboardList, FaFileDownload } from 'react-icons/fa';
import { FiAlertCircle, FiCheck, FiX } from 'react-icons/fi';
import { ThemeContext } from '../../context/ThemeContext';
import ThemeToggle from '../UI/ThemeToggle';

const Notifications = ({ role }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewedAnnouncements, setViewedAnnouncements] = useState(new Set());
  const [filter, setFilter] = useState('all'); // 'all', 'new', 'viewed'
  const { theme } = useContext(ThemeContext);

  // Define convertToDate function outside of useEffect
  const convertToDate = (timestamp) => {
    if (!timestamp) return new Date();
    if (timestamp && typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date) ? new Date() : date;
    }
    if (typeof timestamp === 'number') return new Date(timestamp);
    if (timestamp instanceof Date) return timestamp;
    return new Date();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setLoading(true);
          setError('');

          const [allAnnouncementsSnapshot, targetedAnnouncementsSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'announcements'), where('target', '==', 'all'))),
            getDocs(query(collection(db, 'announcements'), where('target', 'array-contains', user.uid))),
          ]);

          const announcementList = [
            ...allAnnouncementsSnapshot.docs,
            ...targetedAnnouncementsSnapshot.docs,
          ]
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
              date: convertToDate(doc.data().timestamp),
            }))
            .filter((ann, index, self) => index === self.findIndex((a) => a.id === ann.id))
            .sort((a, b) => b.date - a.date);

          setAnnouncements(announcementList);

          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().viewedAnnouncements) {
            setViewedAnnouncements(new Set(userDoc.data().viewedAnnouncements));
          }
        } catch (err) {
          setError('Failed to load notifications: ' + err.message);
          console.error('Error loading notifications:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setError('User is not authenticated. Please log in.');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleViewAnnouncement = async (announcementId) => {
    if (!viewedAnnouncements.has(announcementId)) {
      const updatedViewed = new Set([...viewedAnnouncements, announcementId]);
      setViewedAnnouncements(updatedViewed);
      await setDoc(
        doc(db, 'users', auth.currentUser.uid),
        { viewedAnnouncements: [...updatedViewed] },
        { merge: true }
      );
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    if (filter === 'new') return !viewedAnnouncements.has(ann.id);
    if (filter === 'viewed') return viewedAnnouncements.has(ann.id);
    return true;
  });

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
                  transform: `rotate(${i * 45}deg) translate(0, -18px)`,
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
      <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-xl shadow-lg max-w-md w-full text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100'}`}>
            <FiX className="text-red-500 text-2xl" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Error Loading Notifications
          </h3>
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <motion.button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (role !== 'student') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-xl shadow-lg max-w-md w-full text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100'}`}>
            <FiX className="text-red-500 text-2xl" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Access Denied
          </h3>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            You don't have permission to view this page.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 md:mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div />
              <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
              </h1>
              <p className={`mb-5 mt-1 text-sm md:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {filteredAnnouncements.length} of {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                {['all', 'new', 'viewed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === f ? 
                      (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-800 shadow') : 
                      (theme === 'dark' ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100')}`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <ThemeToggle />
            <div className="flex items-center gap-3">
              <div className={`flex rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                {['all', 'new', 'viewed'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${filter === f ? 
                      (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-800 shadow') : 
                      (theme === 'dark' ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100')}`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <ThemeToggle />
            </div>
          </div>
        </motion.header>

        {filteredAnnouncements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`rounded-xl shadow-sm p-6 md:p-8 text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
          >
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
              <FaClipboardList className={`text-2xl md:text-3xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h3 className={`text-lg md:text-xl font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              No {filter !== 'all' ? filter : ''} Notifications
            </h3>
            <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              {filter === 'all' 
                ? 'You have no announcements yet.' 
                : filter === 'new' 
                  ? 'No new announcements.' 
                  : 'No viewed announcements.'}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Mobile View - Card Layout */}
            <div className="space-y-3 md:hidden">
              <AnimatePresence>
                {filteredAnnouncements.map((ann) => (
                  <motion.div
                    key={ann.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}
                    onClick={() => handleViewAnnouncement(ann.id)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} break-words`}>
                          {ann.content || 'N/A'}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatDate(ann.date)}
                          </span>
                          {viewedAnnouncements.has(ann.id) ? (
                            <span className="text-xs text-green-500 flex items-center gap-1">
                              <FiCheck size={14} /> Viewed
                            </span>
                          ) : (
                            <span className="text-xs text-red-500 flex items-center gap-1">
                              <FiAlertCircle size={14} /> New
                            </span>
                          )}
                        </div>
                      </div>
                      {ann.file && (
                        <motion.a
                          href={ann.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className={`flex-shrink-0 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                          onClick={(e) => e.stopPropagation()}
                          whileHover={{ scale: 1.1 }}
                        >
                          <FaFileDownload size={18} />
                        </motion.a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Desktop View - Table Layout */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`rounded-xl shadow-lg overflow-hidden hidden md:block ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                  <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                    <tr>
                      {['Content', 'File', 'Date', 'Status'].map((header, index) => (
                        <motion.th
                          key={header}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className={`px-4 md:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
                        >
                          {header}
                        </motion.th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <AnimatePresence>
                      {filteredAnnouncements.map((ann, index) => (
                        <motion.tr
                          key={ann.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: 0.05 * index }}
                          className={`${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors cursor-pointer`}
                          onClick={() => handleViewAnnouncement(ann.id)}
                        >
                          <td className={`px-4 md:px-6 py-3 md:py-4 whitespace-normal text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} max-w-xs lg:max-w-md xl:max-w-2xl`}>
                            <div className="line-clamp-2">
                              {ann.content || 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm">
                            {ann.file ? (
                              <motion.a
                                href={ann.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className={`flex items-center gap-2 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                                whileHover={{ x: 2 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FaFileDownload />
                                Download
                              </motion.a>
                            ) : (
                              <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>N/A</span>
                            )}
                          </td>
                          <td className={`px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatDate(ann.date)}
                          </td>
                          <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm">
                            {viewedAnnouncements.has(ann.id) ? (
                              <span className="flex items-center gap-1 text-green-500">
                                <FiCheck /> Viewed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-500">
                                <FiAlertCircle /> New
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;