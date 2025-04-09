import { useState, useEffect, useContext } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFlag, FiEdit, FiX, FiUser, FiCheck, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { ThemeContext } from '../../context/ThemeContext';
import ThemeToggle from '../UI/ThemeToggle';
import FlagModal from '../FlagModal'; // Import the new FlagModal component

const ExamStudents = ({ role }) => {
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [newClass, setNewClass] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [flaggingStudent, setFlaggingStudent] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const { theme } = useContext(ThemeContext);

  // Check for mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setLoading(true);
          setError('');

          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            throw new Error('Teacher document does not exist.');
          }

          const userData = userDoc.data();
          if (!userData.teacherId) {
            throw new Error('Teacher ID is missing in user data.');
          }

          setTeacherId(userData.teacherId);

          // Fetch exams created by the teacher
          const examsQuery = query(collection(db, 'exams'), where('teacherId', '==', userData.teacherId));
          const examsSnapshot = await getDocs(examsQuery);
          const examList = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setExams(examList);

          // Fetch all students
          const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student')
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          const allStudentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllStudents(allStudentsData);

          // Filter students who are registered for the teacher's exams
          const examStudentIds = new Set();
          for (const exam of examList) {
            const resultsQuery = query(collection(db, 'examResults'), where('examId', '==', exam.id));
            const resultsSnapshot = await getDocs(resultsQuery);
            resultsSnapshot.forEach(resultDoc => {
              const resultData = resultDoc.data();
              examStudentIds.add(resultData.studentId);
            });
          }

          const filteredStudents = allStudentsData.filter(student => examStudentIds.has(student.id));
          setStudents(filteredStudents);
        } catch (err) {
          console.error('Error in ExamStudents useEffect:', err);
          setError('Failed to load students: ' + err.message);
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

  const parseDob = (dob) => {
    try {
      const date = new Date(dob);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return date;
    } catch (error) {
      console.error(`Error parsing dob: ${dob}`, error);
      return null;
    }
  };

  const handleFlagStudent = (student) => {
    setFlaggingStudent(student);
    setFlagReason(''); // Reset the flag reason when opening the modal
  };

  const handleSubmitFlag = async () => {
    if (!flagReason.trim()) {
      alert('Please provide a reason for flagging this student.');
      return;
    }

    try {
      const flagDocRef = doc(collection(db, 'flaggedStudents'));
      await setDoc(flagDocRef, {
        studentId: flaggingStudent.id,
        teacherId: teacherId,
        reason: flagReason,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      alert('Student has been flagged for review. An admin will review your request.');
      setFlaggingStudent(null);
      setFlagReason('');
    } catch (err) {
      console.error('Error flagging student:', err);
      alert('Failed to flag student: ' + err.message);
    }
  };

  const handleCancelFlag = () => {
    setFlaggingStudent(null);
    setFlagReason('');
  };

  const handleEditClass = (student) => {
    setEditingStudent(student.id);
    setNewClass(student.class || '');
  };

  const handleSaveClass = async (studentId) => {
    try {
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { class: newClass });

      setStudents(students.map(student =>
        student.id === studentId ? { ...student, class: newClass } : student
      ));
      setAllStudents(allStudents.map(student =>
        student.id === studentId ? { ...student, class: newClass } : student
      ));
      setEditingStudent(null);
      setNewClass('');
    } catch (err) {
      alert('Failed to update class: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setNewClass('');
  };

  // Filter students by selected class and search query
  const filteredClassStudents = allStudents.filter(student => {
    const matchesClass = selectedClass ? student.class === selectedClass : true;
    const matchesSearch = searchQuery
      ? (student.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         student.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         student.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesClass && matchesSearch;
  });

  // List of classes for dropdown
  const classes = Array.from({ length: 12 }, (_, i) => `Basic ${i + 1}`);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        ease: "easeOut",
        duration: 0.3
      }
    }
  };

  const LoadingSpinner = () => (
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
              style={{
                top: '0',
                left: '50%',
                transform: `rotate(${i * 45}deg) translate(0, -18px)`
              }}
            />
          ))}
        </div>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}></p>
      </motion.div>
    </div>
  );

  const ErrorMessage = ({ error }) => (
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
          Error Loading Students
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

  const AccessDenied = () => (
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

  const EmptyState = ({ title, message }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-xl shadow-sm p-8 text-center ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
    >
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
        <FiUser className={`text-3xl ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
      </div>
      <h3 className={`text-xl font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
        {title}
      </h3>
      <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
        {message}
      </p>
    </motion.div>
  );

  const StudentRow = ({ student, index, isRegistered }) => {
    const dob = parseDob(student.dob);
    const dobFormatted = dob ? dob.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }) : 'N/A';

    return (
      <motion.tr 
        key={student.id} 
        className={`transition-colors ${theme === 'dark' ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}
        variants={itemVariants}
        custom={index}
      >
        <td className="px-4 py-4 whitespace-nowrap">
          {student.profilePicture ? (
            <img
              src={student.profilePicture}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {student.firstName?.[0]?.toUpperCase() || 'S'}
              </span>
            </div>
          )}
        </td>
        
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex flex-col">
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {`${student.firstName || ''} ${student.surname || ''}`.trim() || 'Unknown'}
            </span>
            {isMobile && (
              <span className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {student.registrationNumber || 'N/A'}
              </span>
            )}
          </div>
        </td>
        
        {!isMobile && (
          <td className="px-4 py-4 whitespace-nowrap text-sm font-mono">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              {student.registrationNumber || 'N/A'}
            </span>
          </td>
        )}
        
        {!isMobile && (
          <td className="px-4 py-4 whitespace-nowrap text-sm">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              {dobFormatted}
            </span>
          </td>
        )}
        
        {!isMobile && (
          <td className="px-4 py-4 whitespace-nowrap text-sm">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              {student.email || 'N/A'}
            </span>
          </td>
        )}
        
        <td className="px-4 py-4 whitespace-nowrap">
          {editingStudent === student.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className={`px-2 py-1 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'}`}
                placeholder="Enter class"
              />
              <motion.button
                onClick={() => handleSaveClass(student.id)}
                className={`${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiCheck size={16} />
              </motion.button>
              <motion.button
                onClick={handleCancelEdit}
                className={`${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX size={16} />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}>
                {student.class || 'N/A'}
              </span>
              <motion.button
                onClick={() => handleEditClass(student)}
                className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiEdit size={14} />
              </motion.button>
            </div>
          )}
        </td>
        
        <td className="px-4 py-4 whitespace-nowrap">
          <motion.button
            onClick={() => handleFlagStudent(student)}
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${theme === 'dark' ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-800/20' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FiFlag className="mr-1" size={12} />
            {!isMobile && <span>Flag for Review</span>}
          </motion.button>
        </td>
      </motion.tr>
    );
  };

  const StudentTable = ({ students, title, description, isRegistered = false }) => (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="mb-12"
    >
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
          {title}
        </h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {description}
        </p>
        <div className={`w-16 h-1 rounded-full mt-3 ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
      </motion.header>

      {students.length === 0 ? (
        <EmptyState 
          title={isRegistered ? "No Students Found" : "No Students Found"} 
          message={isRegistered ? "No students are registered for your exams." : "No students found for the selected class or search criteria."} 
        />
      ) : (
        <motion.div
          variants={containerVariants}
          className={`rounded-xl shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={`${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'}`}>
                <motion.tr
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ease: "easeOut", duration: 0.4 }}
                >
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Profile</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</span>
                  </th>
                  {!isMobile && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Reg No.</span>
                    </th>
                  )}
                  {!isMobile && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>DOB</span>
                    </th>
                  )}
                  {!isMobile && (
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Email</span>
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Class</span>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Actions</span>
                  </th>
                </motion.tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                {students.map((student, index) => (
                  <StudentRow key={student.id} student={student} index={index} isRegistered={isRegistered} />
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (role !== 'teacher') return <AccessDenied />;

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Registered Students Table */}
        <StudentTable 
          students={students} 
          title="Registered Students" 
          description="Manage students registered for your exams" 
          isRegistered={true}
        />

        {/* Students by Class Table */}
        <div>
          <motion.header 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className={`text-2xl md:text-3xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
              Students by Class
            </h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              View and manage students by class
            </p>
            <div className={`w-16 h-1 rounded-full mt-3 ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
          </motion.header>

          {/* Class Selection and Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
            <div className="flex-1">
              <label htmlFor="class-select" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Class
              </label>
              <select
                id="class-select"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className={`w-full px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'}`}
              >
                <option value="">All Classes</option>
                {classes.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="search" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Search Students
              </label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or reg no..."
                  className={`w-full pl-10 pr-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'}`}
                />
                <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
            </div>
          </motion.div>

          {filteredClassStudents.length === 0 ? (
            <EmptyState 
              title="No Students Found" 
              message="No students found for the selected class or search criteria." 
            />
          ) : (
            <motion.div
              variants={containerVariants}
              className={`rounded-xl shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={`${theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50'}`}>
                    <motion.tr
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ease: "easeOut", duration: 0.4 }}
                    >
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Profile</span>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name</span>
                      </th>
                      {!isMobile && (
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Reg No.</span>
                        </th>
                      )}
                      {!isMobile && (
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>DOB</span>
                        </th>
                      )}
                      {!isMobile && (
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Email</span>
                        </th>
                      )}
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Class</span>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Actions</span>
                      </th>
                    </motion.tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                    {filteredClassStudents.map((student, index) => (
                      <StudentRow key={student.id} student={student} index={index} />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <ThemeToggle />
      <AnimatePresence>
        {flaggingStudent && (
          <FlagModal
            key="flag-modal"
            flaggingStudent={flaggingStudent}
            flagReason={flagReason}
            setFlagReason={setFlagReason}
            handleSubmitFlag={handleSubmitFlag}
            handleCancelFlag={handleCancelFlag}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamStudents;