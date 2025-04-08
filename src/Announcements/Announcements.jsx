import { useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase/config';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiUpload, FiSend, FiX, FiUser, FiDownload } from 'react-icons/fi';
import { ThemeContext } from '../context/ThemeContext';
import ThemeToggle from '../components/UI/ThemeToggle';
import { FaSpinner } from 'react-icons/fa';
import { FiChevronDown, FiChevronUp, FiRefreshCw } from 'react-icons/fi';
import { uploadFileToCloudinary } from '../utils/cloudinary';
import Select from 'react-select';

const Announcements = ({ role }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetStudents, setTargetStudents] = useState('all');
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState(new Set());
  const { theme } = useContext(ThemeContext);

  // Define all possible classes
  const allClasses = Array.from({ length: 12 }, (_, i) => `Basic ${i + 1}`);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { when: "beforeChildren", staggerChildren: 0.1, ease: [0.16, 0.77, 0.47, 0.97], duration: 0.6 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { ease: [0.16, 0.77, 0.47, 0.97], duration: 0.5 } }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.4 } }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setLoading(true);
          setError('');

          // Fetch all students
          const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
          const studentsSnapshot = await getDocs(studentsQuery);
          const studentList = studentsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            fullName: `${doc.data().firstName || ''} ${doc.data().surname || ''}`.trim()
          }));
          setStudents(studentList);

          // Use the static list of all classes
          setClasses(allClasses);

          // Fetch existing announcements
          const announcementsQuery = query(collection(db, 'announcements'), where('teacherId', '==', user.uid));
          const announcementsSnapshot = await getDocs(announcementsQuery);
          const announcementList = announcementsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            date: doc.data().timestamp ? new Date(doc.data().timestamp) : new Date()
          }));
          setAnnouncements(announcementList);
        } catch (err) {
          console.error('Error loading data:', err);
          setError('Failed to load data: ' + err.message);
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

  const handleSend = async () => {
    if (!newAnnouncement && !selectedFile) {
      alert('Please enter an announcement or select a file to send.');
      return;
    }

    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10 MB limit. Please upload a smaller file.');
      return;
    }

    try {
      setLoading(true);

      let fileUrl = null;
      if (selectedFile) {
        fileUrl = await uploadFileToCloudinary(selectedFile);
      }

      let targetValue;
      if (targetStudents === 'all') {
        targetValue = 'all';
      } else if (typeof targetStudents === 'string' && targetStudents !== 'all') {
        // Specific Class: Map class to student UIDs
        const studentsInClass = students
          .filter(student => student.class === targetStudents)
          .map(student => student.id);
        if (studentsInClass.length === 0) {
          alert(`No students found in class ${targetStudents}.`);
          setLoading(false);
          return;
        }
        targetValue = studentsInClass;
      } else {
        // Specific Students: Already an array of UIDs
        targetValue = targetStudents;
      }

      const announcementData = {
        teacherId: auth.currentUser.uid,
        content: newAnnouncement || '',
        file: fileUrl,
        fileName: selectedFile ? selectedFile.name : null,
        fileType: selectedFile ? selectedFile.type : null,
        fileSize: selectedFile ? selectedFile.size : null,
        target: targetValue,
        timestamp: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'announcements'), announcementData);
      setAnnouncements([...announcements, { 
        ...announcementData, 
        id: docRef.id,
        date: new Date()
      }]);
      
      setNewAnnouncement('');
      setSelectedFile(null);
      setTargetStudents('all');
      setIsExpanded(false);
    } catch (err) {
      console.error('Error sending announcement:', err);
      if (err.message.includes('File size too large')) {
        alert('Failed to upload file: The file size exceeds the 10 MB limit.');
      } else {
        alert('Failed to send announcement: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (announcementId) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteDoc(doc(db, 'announcements', announcementId));
        setAnnouncements(announcements.filter(ann => ann.id !== announcementId));
        setSelectedAnnouncements(new Set([...selectedAnnouncements].filter(id => id !== announcementId)));
      } catch (err) {
        console.error('Error deleting announcement:', err);
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAnnouncements.size === 0) {
      alert('Please select at least one announcement to delete.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedAnnouncements.size} announcement(s)?`)) {
      try {
        const deletePromises = [...selectedAnnouncements].map((announcementId) =>
          deleteDoc(doc(db, 'announcements', announcementId))
        );
        await Promise.all(deletePromises);
        setAnnouncements(announcements.filter((ann) => !selectedAnnouncements.has(ann.id)));
        setSelectedAnnouncements(new Set());
      } catch (err) {
        console.error('Error deleting announcements:', err);
        alert('Failed to delete announcements: ' + err.message);
      }
    }
  };

  const handleSelectAnnouncement = (announcementId) => {
    const updatedSelected = new Set(selectedAnnouncements);
    if (updatedSelected.has(announcementId)) {
      updatedSelected.delete(announcementId);
    } else {
      updatedSelected.add(announcementId);
    }
    setSelectedAnnouncements(updatedSelected);
  };

  const handleSelectAll = () => {
    if (selectedAnnouncements.size === announcements.length) {
      setSelectedAnnouncements(new Set());
    } else {
      const allIds = new Set(announcements.map((ann) => ann.id));
      setSelectedAnnouncements(allIds);
    }
  };

  const handleDownload = (fileUrl, fileName) => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('No file available to download.');
    }
  };

  // Options for react-select
  const studentOptions = students.map(student => ({
    value: student.id,
    label: `${student.fullName} (${student.registrationNumber || student.id.slice(0, 6)})`,
  }));

  // Custom styles for react-select
  const selectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
      borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
      color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
      '&:hover': { borderColor: theme === 'dark' ? '#6b7280' : '#9ca3af' },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
      color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? theme === 'dark' ? '#1f2937' : '#e5e7eb' 
        : state.isFocused 
          ? theme === 'dark' ? '#4b5563' : '#f3f4f6' 
          : 'transparent',
      color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
      '&:active': { backgroundColor: theme === 'dark' ? '#1f2937' : '#d1d5db' },
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: theme === 'dark' ? '#4b5563' : '#e5e7eb',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
      '&:hover': { backgroundColor: '#ef4444', color: '#ffffff' },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
    }),
    input: (provided) => ({
      ...provided,
      color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
    }),
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
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
                style={{ top: '0', left: '50%', transform: `rotate(${i * 45}deg) translate(0, -18px)` }}
              />
            ))}
          </div>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}></p>
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
          className={`p-6 rounded-xl shadow-lg max-w-md w-full mx-4 text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100'}`}>
            <FiX className="text-red-500 text-2xl" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Error Loading Announcements
          </h3>
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{error}</p>
          <motion.button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 mx-auto ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <FiRefreshCw />
            Try Again
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (role !== 'teacher') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-xl shadow-lg max-w-md w-full mx-4 text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
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
          initial="hidden"
          animate="visible"
          variants={headerVariants}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                Announcements
              </h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Communicate with your students and share learning materials
              </p>
              <div className={`w-16 h-1 rounded-full mt-3 ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
            </div>
            {announcements.length > 0 && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedAnnouncements.size === announcements.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4"
                />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Select All
                </span>
                <motion.button
                  onClick={handleBulkDelete}
                  disabled={selectedAnnouncements.size === 0}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    selectedAnnouncements.size === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-red-500 hover:bg-red-600'
                  } text-white transition-colors`}
                  whileHover={{ scale: selectedAnnouncements.size > 0 ? 1.05 : 1 }}
                  whileTap={{ scale: selectedAnnouncements.size > 0 ? 0.95 : 1 }}
                >
                  Delete Selected
                </motion.button>
              </div>
            )}
          </div>
        </motion.header>

        {/* Create New Announcement Card */}
        <motion.div
          className={`rounded-xl shadow-sm mb-8 overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
          whileHover={{ y: -2 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: "easeOut" }}
        >
          <div 
            className={`p-4 sm:p-6 cursor-pointer flex justify-between items-center ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'} transition-colors`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div>
              <h2 className={`text-lg sm:text-xl font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                Create New Announcement
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {isExpanded ? 'Collapse form' : 'Expand to create new announcement'}
              </p>
            </div>
            <div className={`text-xl ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-4 sm:p-6 pt-0">
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Announcement Content
                    </label>
                    <textarea
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="Enter your announcement..."
                      className={`w-full p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'}`}
                      rows={4}
                    />
                  </div>

                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Upload Material (Optional)
                    </label>
                    <div className={`flex items-center justify-center w-full rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'} transition-colors cursor-pointer p-6`}>
                      <div className="text-center">
                        <FiUpload className={`mx-auto text-2xl mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          PDF, DOCX, PPTX (Max 10MB)
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={(e) => setSelectedFile(e.target.files[0])}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className={`mt-2 inline-block px-3 py-1 rounded-md text-sm font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors cursor-pointer`}
                        >
                          Choose File
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Target Audience
                    </label>
                    <div className="space-y-4">
                      {/* All Students */}
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="all-students"
                          name="target"
                          value="all"
                          checked={targetStudents === 'all'}
                          onChange={() => setTargetStudents('all')}
                          className={`h-4 w-4 ${theme === 'dark' ? 'text-blue-500 bg-gray-700 border-gray-600' : 'text-blue-600 bg-white border-gray-300'}`}
                        />
                        <label htmlFor="all-students" className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          All Students
                        </label>
                      </div>

                      {/* Specific Class */}
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="specific-class"
                          name="target"
                          value="class"
                          checked={typeof targetStudents === 'string' && targetStudents !== 'all' && classes.includes(targetStudents)}
                          onChange={() => setTargetStudents(classes[0] || '')}
                          className={`h-4 w-4 mt-1 ${theme === 'dark' ? 'text-blue-500 bg-gray-700 border-gray-600' : 'text-blue-600 bg-white border-gray-300'}`}
                        />
                        <div className="ml-2 w-full">
                          <label htmlFor="specific-class" className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Specific Class
                          </label>
                          {typeof targetStudents === 'string' && targetStudents !== 'all' && classes.includes(targetStudents) && (
                            <select
                              value={targetStudents}
                              onChange={(e) => setTargetStudents(e.target.value)}
                              className={`mt-2 w-full p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'}`}
                            >
                              {classes.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Specific Students */}
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="specific-students"
                          name="target"
                          value="specific"
                          checked={Array.isArray(targetStudents)}
                          onChange={() => setTargetStudents([])}
                          className={`h-4 w-4 mt-1 ${theme === 'dark' ? 'text-blue-500 bg-gray-700 border-gray-600' : 'text-blue-600 bg-white border-gray-300'}`}
                        />
                        <div className="ml-2 w-full">
                          <label htmlFor="specific-students" className={`block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Specific Students
                          </label>
                          {Array.isArray(targetStudents) && (
                            <Select
                              isMulti
                              options={studentOptions}
                              value={studentOptions.filter(option => targetStudents.includes(option.value))}
                              onChange={(selected) => setTargetStudents(selected ? selected.map(opt => opt.value) : [])}
                              placeholder="Search by name or registration number..."
                              className="mt-2"
                              styles={selectStyles}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <motion.button
                      onClick={() => {
                        setIsExpanded(false);
                        setNewAnnouncement('');
                        setSelectedFile(null);
                        setTargetStudents('all');
                      }}
                      className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={handleSend}
                      disabled={loading || (!newAnnouncement && !selectedFile) || (Array.isArray(targetStudents) && targetStudents.length === 0)}
                      className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${(!newAnnouncement && !selectedFile) || (Array.isArray(targetStudents) && targetStudents.length === 0) ? 'bg-blue-400' : (theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')} text-white transition-colors`}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <>
                          <FiSend />
                          Send Announcement
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Announcements List */}
        {announcements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`rounded-xl shadow-sm p-8 text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
              <FiUser className={`text-3xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h3 className={`text-xl font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              No Announcements Yet
            </h3>
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
              Create your first announcement to get started
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className={`rounded-xl shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={`${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <motion.tr variants={headerVariants}>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Select</span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Content</span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>File</span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Target</span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Date</span>
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Actions</span>
                    </th>
                  </motion.tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                  {announcements.map((ann, index) => (
                    <motion.tr 
                      key={ann.id}
                      className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}
                      variants={itemVariants}
                      custom={index}
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <input
                          type="checkbox"
                          checked={selectedAnnouncements.has(ann.id)}
                          onChange={() => handleSelectAnnouncement(ann.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-normal text-sm max-w-xs">
                        <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>
                          {ann.content || 'No text content'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {ann.file ? (
                          <motion.button
                            onClick={() => handleDownload(ann.file, ann.fileName)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-800/20' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} transition-colors`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <FiDownload className="mr-1" size={12} />
                            <span className="hidden sm:inline">{ann.fileName || 'Download File'}</span>
                            <span className="sm:hidden">Download</span>
                          </motion.button>
                        ) : (
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            No file
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm hidden sm:table-cell">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {ann.target === 'all' ? (
                            'All Students'
                          ) : Array.isArray(ann.target) ? (
                            <div className="flex items-center">
                              <span className="mr-2">{ann.target.length} students</span>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <span className="text-xs">{ann.target.length}</span>
                              </div>
                            </div>
                          ) : (
                            `Class: ${ann.target}`
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm hidden md:table-cell">
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                          {ann.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <motion.button
                          onClick={() => handleDelete(ann.id)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-red-900/20 text-red-400 hover:bg-red-800/20' : 'bg-red-100 text-red-600 hover:bg-red-200'} transition-colors`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <FiTrash2 className="mr-1" size={12} />
                          <span className="hidden sm:inline">Delete</span>
                          <span className="sm:hidden">Del</span>
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
      <ThemeToggle />
    </div>
  );
};

export default Announcements;