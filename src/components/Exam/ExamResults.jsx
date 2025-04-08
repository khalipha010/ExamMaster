import { useState, useEffect, useContext } from "react";
import { auth, db } from "../../firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiX,
  FiUser,
  FiAward,
  FiPercent,
  FiDownload,
  FiClock,
} from "react-icons/fi";
import { ThemeContext } from "../../context/ThemeContext";
import ThemeToggle from "../UI/ThemeToggle";
import { FaSpinner } from "react-icons/fa";

const ExamResults = ({ role }) => {
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [searchState, setSearchState] = useState({});
  const [expandedExams, setExpandedExams] = useState({});
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const fetchData = async (user) => {
      try {
        setLoading(true);
        setError("");

        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          throw new Error("User document does not exist.");
        }

        const userData = userDoc.data();
        if (!userData.teacherId) {
          throw new Error("Teacher ID is missing in user data.");
        }

        setTeacherId(userData.teacherId);

        // Fetch exams
        const examsQuery = query(
          collection(db, "exams"),
          where("teacherId", "==", userData.teacherId)
        );
        const examsSnapshot = await getDocs(examsQuery);
        const examList = examsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExams(examList);

        // Fetch results
        const resultsQuery = query(
          collection(db, "examResults"),
          where("teacherId", "==", userData.teacherId)
        );
        const resultsSnapshot = await getDocs(resultsQuery);

        const resultsList = await Promise.all(
          resultsSnapshot.docs.map(async (resultDoc) => {
            const resultData = resultDoc.data();
            let studentData = {};

            try {
              const studentDoc = await getDoc(
                doc(db, "users", resultData.studentId)
              );
              if (studentDoc.exists()) {
                studentData = studentDoc.data();
              }
            } catch (err) {
              console.error("Error fetching student data:", err);
            }

            return {
              id: resultDoc.id,
              ...resultData,
              studentName:
                studentData.firstName || studentData.surname
                  ? `${studentData.firstName || ""} ${
                      studentData.surname || ""
                    }`.trim()
                  : "Unknown Student",
              profilePicture: studentData.profilePicture || null,
              admissionNumber: studentData.registrationNumber || "N/A",
              submittedAt: resultData.submittedAt?.toDate() || new Date(),
            };
          })
        );

        setResults(resultsList);

        // Initialize filtered results
        const initialFiltered = {};
        examList.forEach((exam) => {
          initialFiltered[exam.id] = resultsList.filter(
            (result) => result.examId === exam.id
          );
        });
        setFilteredResults(initialFiltered);

        // Initialize search state
        const initialSearchState = {};
        examList.forEach((exam) => {
          initialSearchState[exam.id] = { searchQuery: "", sortBy: "" };
        });
        setSearchState(initialSearchState);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData(user);
      } else {
        setError("User not authenticated");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleExamExpansion = (examId) => {
    setExpandedExams((prev) => ({
      ...prev,
      [examId]: !prev[examId],
    }));
  };

  const handleApprove = async (resultId) => {
    try {
      await updateDoc(doc(db, "examResults", resultId), { approved: true });

      setResults((prev) =>
        prev.map((result) =>
          result.id === resultId ? { ...result, approved: true } : result
        )
      );

      setFilteredResults((prev) => {
        const updated = {};
        for (const examId in prev) {
          updated[examId] = prev[examId].map((result) =>
            result.id === resultId ? { ...result, approved: true } : result
          );
        }
        return updated;
      });
    } catch (err) {
      alert("Failed to approve result: " + err.message);
    }
  };

  const handleApproveAll = async (examId) => {
    if (window.confirm("Approve all results for this exam?")) {
      try {
        const batch = filteredResults[examId]
          .filter((result) => !result.approved)
          .map((result) => ({
            ref: doc(db, "examResults", result.id),
            data: { approved: true },
          }));

        await Promise.all(batch.map(({ ref, data }) => updateDoc(ref, data)));

        setResults((prev) =>
          prev.map((result) =>
            result.examId === examId ? { ...result, approved: true } : result
          )
        );

        setFilteredResults((prev) => ({
          ...prev,
          [examId]: prev[examId].map((result) => ({
            ...result,
            approved: true,
          })),
        }));
      } catch (err) {
        alert("Failed to approve all: " + err.message);
      }
    }
  };

  const handleRetake = async (resultId) => {
    try {
      await updateDoc(doc(db, "examResults", resultId), {
        retakeAllowed: true,
      });

      setResults((prev) =>
        prev.map((result) =>
          result.id === resultId ? { ...result, retakeAllowed: true } : result
        )
      );

      setFilteredResults((prev) => {
        const updated = {};
        for (const examId in prev) {
          updated[examId] = prev[examId].map((result) =>
            result.id === resultId ? { ...result, retakeAllowed: true } : result
          );
        }
        return updated;
      });
    } catch (err) {
      alert("Failed to grant retake: " + err.message);
    }
  };

  const handleRetakeAll = async (examId) => {
    if (window.confirm("Grant retake for all students in this exam?")) {
      try {
        const batch = filteredResults[examId]
          .filter((result) => !result.retakeAllowed)
          .map((result) => ({
            ref: doc(db, "examResults", result.id),
            data: { retakeAllowed: true },
          }));

        await Promise.all(batch.map(({ ref, data }) => updateDoc(ref, data)));

        setResults((prev) =>
          prev.map((result) =>
            result.examId === examId
              ? { ...result, retakeAllowed: true }
              : result
          )
        );

        setFilteredResults((prev) => ({
          ...prev,
          [examId]: prev[examId].map((result) => ({
            ...result,
            retakeAllowed: true,
          })),
        }));
      } catch (err) {
        alert("Failed to grant retake for all: " + err.message);
      }
    }
  };

  const handleDeleteResult = async (resultId, examId) => {
    if (window.confirm("Delete this result permanently?")) {
      try {
        await deleteDoc(doc(db, "examResults", resultId));

        setResults((prev) => prev.filter((result) => result.id !== resultId));

        setFilteredResults((prev) => ({
          ...prev,
          [examId]: prev[examId].filter((result) => result.id !== resultId),
        }));
      } catch (err) {
        alert("Failed to delete result: " + err.message);
      }
    }
  };

  const handleExportCSV = (examId, examTitle) => {
    const examResults = filteredResults[examId] || [];
    const approvedResults = examResults.filter((result) => result.approved);

    if (approvedResults.length === 0) {
      alert("No approved results to export");
      return;
    }

    const headers = [
      "Student Name",
      "Admission Number",
      "Score",
      "Total Questions",
      "Percentage",
      "Submitted At",
    ];
    const rows = approvedResults.map((result) => [
      `"${result.studentName}"`,
      result.admissionNumber,
      result.score,
      result.totalQuestions,
      `${((result.score / result.totalQuestions) * 100).toFixed(2)}%`,
      result.submittedAt.toLocaleString(),
    ]);

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${examTitle.replace(/[^a-z0-9]/gi, "_")}_results.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearch = (examId) => {
    const { searchQuery, sortBy } = searchState[examId] || {};
    const examResults = results.filter((result) => result.examId === examId);

    let filtered = examResults;

    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      filtered = examResults.filter((result) => {
        return (
          result.studentName.toLowerCase().includes(queryLower) ||
          result.admissionNumber.toLowerCase().includes(queryLower) ||
          result.score.toString().includes(searchQuery)
        );
      });
    }

    if (sortBy === "name") {
      filtered.sort((a, b) => a.studentName.localeCompare(b.studentName));
    } else if (sortBy === "score") {
      filtered.sort((a, b) => b.score - a.score);
    }

    setFilteredResults((prev) => ({
      ...prev,
      [examId]: filtered,
    }));
  };

  const handleSearchQueryChange = (examId, value) => {
    setSearchState((prev) => ({
      ...prev,
      [examId]: { ...prev[examId], searchQuery: value },
    }));
  };

  const handleSortChange = (examId, value) => {
    setSearchState((prev) => ({
      ...prev,
      [examId]: { ...prev[examId], sortBy: value },
    }));
    handleSearch(examId);
  };

  const handleResetSearch = (examId) => {
    setSearchState((prev) => ({
      ...prev,
      [examId]: { searchQuery: "", sortBy: "" },
    }));
    const examResults = results.filter((result) => result.examId === examId);
    setFilteredResults((prev) => ({
      ...prev,
      [examId]: examResults,
    }));
  };

  const getExamAnalytics = (examResults) => {
    const totalStudents = examResults.length;
    const totalQuestions = examResults[0]?.totalQuestions || 1;
    const averageScore =
      examResults.reduce((sum, result) => sum + result.score, 0) /
      totalStudents;
    const passRate =
      (examResults.filter((result) => result.score >= totalQuestions / 2)
        .length /
        totalStudents) *
      100;

    return {
      totalStudents,
      averageScore: averageScore.toFixed(2),
      passRate: passRate.toFixed(2),
    };
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-bg)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--secondary-bg)] p-6 rounded-xl shadow-lg border border-[var(--border)] max-w-md text-center"
        >
          <div className="bg-red-100 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiX className="text-red-500 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Error Loading Results
          </h3>
          <p className="text-[var(--text-secondary)] mb-4">{error}</p>
          <motion.button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 mx-auto"
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

  if (role !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-bg)] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--secondary-bg)] p-6 rounded-xl shadow-lg border border-[var(--border)] max-w-md text-center"
        >
          <div className="bg-red-100 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiX className="text-red-500 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Access Denied
          </h3>
          <p className="text-[var(--text-secondary)]">
            You don't have permission to view this page.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--primary-bg)] p-4 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--text-primary)] font-display">
            Exam Results
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Review and manage student exam performance
          </p>
          <div className="w-16 h-1 bg-[var(--accent)] rounded-full mt-3"></div>
        </motion.header>

        {exams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[var(--secondary-bg)] rounded-xl shadow-sm border border-[var(--border)] p-8 text-center"
          >
            <div className="bg-[var(--accent)]/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAward className="text-[var(--accent)] text-3xl" />
            </div>
            <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">
              No Exams Found
            </h3>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              When you create exams, results will appear here. Get started by
              creating your first exam.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {exams.map((exam) => {
              const examResults = filteredResults[exam.id] || [];
              const analytics = getExamAnalytics(examResults);
              const isExpanded = expandedExams[exam.id];
              const { searchQuery, sortBy } = searchState[exam.id] || {};

              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[var(--secondary-bg)] rounded-xl shadow-sm overflow-hidden border border-[var(--border)]"
                >
                  <motion.div
                    className="p-4 sm:p-6 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[var(--primary-bg)] transition-colors"
                    onClick={() => toggleExamExpansion(exam.id)}
                    whileHover={{ backgroundColor: "var(--primary-bg)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] truncate">
                        {exam.title}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <FiUser className="opacity-70" size={14} />
                          Class: {exam.class}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiAward className="opacity-70" size={14} />
                          Questions: {exam.questions.length}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock className="opacity-70" size={14} />
                          Duration: {exam.timer} mins
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-[var(--primary-bg)] px-3 py-1 rounded-full text-sm font-medium text-[var(--text-primary)]">
                        {analytics.totalStudents}{" "}
                        {analytics.totalStudents === 1 ? "student" : "students"}
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        {isExpanded ? (
                          <FiChevronUp
                            size={20}
                            className="transition-transform"
                          />
                        ) : (
                          <FiChevronDown
                            size={20}
                            className="transition-transform"
                          />
                        )}
                      </div>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 sm:p-6 pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <motion.div
                              className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-4 rounded-xl border border-blue-500/20"
                              whileHover={{ y: -3 }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-500/20 p-2 rounded-lg">
                                  <FiUser className="text-blue-500" size={20} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                                    Total Students
                                  </p>
                                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {analytics.totalStudents}
                                  </p>
                                </div>
                              </div>
                            </motion.div>

                            <motion.div
                              className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-4 rounded-xl border border-purple-500/20"
                              whileHover={{ y: -3 }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-purple-500/20 p-2 rounded-lg">
                                  <FiAward
                                    className="text-purple-500"
                                    size={20}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                                    Average Score
                                  </p>
                                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {analytics.averageScore}
                                    <span className="text-sm font-normal text-[var(--text-secondary)] ml-1">
                                      / {exam.questions.length}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </motion.div>

                            <motion.div
                              className="bg-gradient-to-br from-green-500/10 to-green-600/10 p-4 rounded-xl border border-green-500/20"
                              whileHover={{ y: -3 }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="bg-green-500/20 p-2 rounded-lg">
                                  <FiPercent
                                    className="text-green-500"
                                    size={20}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                                    Pass Rate
                                  </p>
                                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                                    {analytics.passRate}%
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 mb-6">
                            <div className="relative flex-grow">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FiSearch className="text-[var(--text-secondary)]" />
                              </div>
                              <input
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery || ""}
                                onChange={(e) =>
                                  handleSearchQueryChange(
                                    exam.id,
                                    e.target.value
                                  )
                                }
                                onKeyPress={(e) =>
                                  e.key === "Enter" && handleSearch(exam.id)
                                }
                                className="pl-10 pr-24 py-2.5 bg-[var(--primary-bg)] border border-[var(--border)] rounded-lg w-full focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                              />
                              <div className="absolute inset-y-0 right-0 flex">
                                <motion.button
                                  onClick={() => handleSearch(exam.id)}
                                  className="px-3 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors border-r border-[var(--border)]"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiSearch />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleResetSearch(exam.id)}
                                  className="px-3 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <FiRefreshCw />
                                </motion.button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
                              <motion.select
                                value={sortBy || ""}
                                onChange={(e) =>
                                  handleSortChange(exam.id, e.target.value)
                                }
                                className="px-3 py-2 bg-[var(--primary-bg)] border border-[var(--border)] rounded-lg text-sm focus:ring-[var(--accent)] focus:border-[var(--accent)] text-[var(--text-primary)]"
                                whileHover={{ y: -2 }}
                              >
                                <option value="">Sort by...</option>
                                <option value="name">Name (A-Z)</option>
                                <option value="score">
                                  Score (High to Low)
                                </option>
                              </motion.select>

                              <motion.button
                                onClick={() => handleApproveAll(exam.id)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <FiCheck size={16} />
                                <span className="hidden sm:inline">
                                  Approve All
                                </span>
                              </motion.button>

                              <motion.button
                                onClick={() => handleRetakeAll(exam.id)}
                                className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 text-sm"
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <FiRefreshCw size={16} />
                                <span className="hidden sm:inline">
                                  Retake All
                                </span>
                              </motion.button>

                              <motion.button
                                onClick={() =>
                                  handleExportCSV(exam.id, exam.title)
                                }
                                className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <FiDownload size={16} />
                                <span className="hidden sm:inline">
                                  Export CSV
                                </span>
                              </motion.button>
                            </div>
                          </div>

                          {examResults.length === 0 ? (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="bg-[var(--primary-bg)] p-8 rounded-xl border border-[var(--border)] text-center"
                            >
                              <div className="bg-[var(--accent)]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiSearch className="text-[var(--accent)] text-2xl" />
                              </div>
                              <h4 className="text-lg font-medium text-[var(--text-primary)] mb-1">
                                No Results Found
                              </h4>
                              <p className="text-[var(--text-secondary)]">
                                Try adjusting your search criteria
                              </p>
                            </motion.div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                              <table className="min-w-full divide-y divide-[var(--border)]">
                                <thead className="bg-[var(--primary-bg)]">
                                  <tr>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                                    >
                                      #
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                                    >
                                      Student
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden sm:table-cell"
                                    >
                                      Admission No.
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                                    >
                                      Score
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell"
                                    >
                                      Approval
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider hidden md:table-cell"
                                    >
                                      Retake
                                    </th>
                                    <th
                                      scope="col"
                                      className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider"
                                    >
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-[var(--secondary-bg)] divide-y divide-[var(--border)]">
                                  {examResults.map((result, index) => (
                                    <motion.tr
                                      key={result.id}
                                      className="hover:bg-[var(--primary-bg)] transition-colors"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                                        {index + 1}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center">
                                          {result.profilePicture ? (
                                            <img
                                              src={result.profilePicture}
                                              alt="Profile"
                                              className="w-8 h-8 rounded-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full bg-[var(--primary-bg)] flex items-center justify-center">
                                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                                {result.studentName[0]?.toUpperCase()}
                                              </span>
                                            </div>
                                          )}
                                          <div className="ml-3">
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                              {result.studentName}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] sm:hidden">
                                              {result.admissionNumber}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)] font-mono hidden sm:table-cell">
                                        {result.admissionNumber}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-primary)]">
                                        <span className="font-medium">
                                          {result.score}
                                        </span>
                                        <span className="text-[var(--text-secondary)] text-xs ml-1">
                                          / {result.totalQuestions}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                                        {result.approved ? (
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/20 text-green-500">
                                            <FiCheck
                                              className="mr-1"
                                              size={12}
                                            />
                                            Approved
                                          </span>
                                        ) : (
                                          <motion.button
                                            onClick={() =>
                                              handleApprove(result.id)
                                            }
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-900/20 text-[var(--accent)] hover:bg-blue-800/20 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                          >
                                            <FiCheck
                                              className="mr-1"
                                              size={12}
                                            />
                                            Approve
                                          </motion.button>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                                        {result.retakeAllowed ? (
                                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/20 text-green-500">
                                            <FiCheck
                                              className="mr-1"
                                              size={12}
                                            />
                                            Granted
                                          </span>
                                        ) : (
                                          <motion.button
                                            onClick={() =>
                                              handleRetake(result.id)
                                            }
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-900/20 text-amber-500 hover:bg-amber-800/20 transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                          >
                                            <FiRefreshCw
                                              className="mr-1"
                                              size={12}
                                            />
                                            Grant
                                          </motion.button>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <motion.button
                                            onClick={() =>
                                              handleDeleteResult(
                                                result.id,
                                                exam.id
                                              )
                                            }
                                            className="inline-flex items-center p-1.5 rounded-full text-xs font-medium bg-red-900/20 text-red-500 hover:bg-red-800/20 transition-colors"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            title="Delete"
                                          >
                                            <FiTrash2 size={14} />
                                          </motion.button>

                                          {!result.approved && (
                                            <motion.button
                                              onClick={() =>
                                                handleApprove(result.id)
                                              }
                                              className="inline-flex items-center p-1.5 rounded-full text-xs font-medium bg-blue-900/20 text-[var(--accent)] hover:bg-blue-800/20 transition-colors md:hidden"
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              title="Approve"
                                            >
                                              <FiCheck size={14} />
                                            </motion.button>
                                          )}

                                          {!result.retakeAllowed && (
                                            <motion.button
                                              onClick={() =>
                                                handleRetake(result.id)
                                              }
                                              className="inline-flex items-center p-1.5 rounded-full text-xs font-medium bg-amber-900/20 text-amber-500 hover:bg-amber-800/20 transition-colors md:hidden"
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              title="Grant Retake"
                                            >
                                              <FiRefreshCw size={14} />
                                            </motion.button>
                                          )}
                                        </div>
                                      </td>
                                    </motion.tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <ThemeToggle />
    </div>
  );
};

export default ExamResults;