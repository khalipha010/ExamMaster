import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiClock,
  FiBook,
  FiUsers,
} from "react-icons/fi";
import { ThemeContext } from "../../context/ThemeContext";
import ThemeToggle from "../UI/ThemeToggle";

const ExamList = ({ role }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredExams, setFilteredExams] = useState([]);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");
        if (role !== "teacher") throw new Error("Unauthorized access");

        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) throw new Error("User data not found");

        const teacherId = userDoc.data().teacherId;
        if (!teacherId) throw new Error("Teacher ID not found");

        const q = query(
          collection(db, "exams"),
          where("teacherId", "==", teacherId)
        );
        const querySnapshot = await getDocs(q);
        const examData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExams(examData);
        setFilteredExams(examData);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching exams:", err);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) fetchExams();
      else setError("User not authenticated");
    });

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

  const handleDelete = async (examId) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;

    try {
      await deleteDoc(doc(db, "exams", examId));
      setExams(exams.filter((exam) => exam.id !== examId));
      setFilteredExams(filteredExams.filter((exam) => exam.id !== examId));
    } catch (err) {
      setError("Failed to delete exam: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-bg)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="relative w-8 h-8">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                style={{
                  top: "0",
                  left: "50%",
                  transform: `rotate(${i * 45}deg) translate(0, -12px)`,
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
        <div className="max-w-md p-6 bg-[var(--secondary-bg)] rounded-xl shadow-md border border-red-300 dark:border-red-700">
          <h3 className="text-xl font-semibold text-red-500 mb-2">Error</h3>
          <p className="text-[var(--text-primary)] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl mx-auto"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-display">
              Your Exams
            </h2>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          <div className="relative w-full sm:w-64">
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

        {filteredExams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-[var(--secondary-bg)] p-8 rounded-xl shadow-sm border border-[var(--border)] text-center"
          >
            <FiBook className="mx-auto text-4xl text-[var(--text-secondary)] mb-4" />
            <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">
              {searchTerm ? 'No matching exams found' : 'No Exams Created Yet'}
            </h3>
            <p className="text-[var(--text-secondary)] mb-6">
              {searchTerm ? 'Try a different search term' : 'Get started by creating your first exam'}
            </p>
            {searchTerm ? (
              <motion.button
                onClick={() => setSearchTerm('')}
                className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Clear Search
              </motion.button>
            ) : (
              <motion.button
                onClick={() => navigate("/teacher-dashboard/create-exam")}
                className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 transition-colors"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Create Exam
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
                  className="bg-[var(--secondary-bg)] p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-[var(--border)]"
                >
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 truncate">
                    {exam.title}
                  </h3>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center text-[var(--text-secondary)]">
                      <FiUsers className="mr-2 flex-shrink-0" />
                      <span className="truncate">Class: {exam.class}</span>
                    </div>
                    <div className="flex items-center text-[var(--text-secondary)]">
                      <FiClock className="mr-2 flex-shrink-0" />
                      <span>Duration: {exam.timer} mins</span>
                    </div>
                    <div className="flex items-center text-[var(--text-secondary)]">
                      <FiBook className="mr-2 flex-shrink-0" />
                      <span>Questions: {exam.questions?.length || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      onClick={() =>
                        navigate(`/teacher-dashboard/edit-exam/${exam.id}`)
                      }
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FiEdit2 />
                      <span>Edit</span>
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(exam.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FiTrash2 />
                      <span>Delete</span>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
      <ThemeToggle />
    </div>
  );
};

export default ExamList;