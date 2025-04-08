import { useEffect, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { doc, getDoc, setDoc, collection, query, getDocs, where } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  FiHome, FiUser, FiLogOut, FiPlus, FiBook, FiBarChart2, 
  FiChevronRight, FiUsers, FiBell
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeContext } from "../../context/ThemeContext";

const generateTeacherId = () => {
  const randomId = Math.floor(10000 + Math.random() * 90000).toString();
  return `TCH-${randomId}`;
};

const Sidebar = ({ role }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [isShining, setIsShining] = useState(false);
  const [newNotifications, setNewNotifications] = useState(0);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 640;
      setIsOpen(isDesktop ? true : false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            throw new Error("User document does not exist.");
          }

          let data = userDoc.data();
          if (role === "teacher" && !data.teacherId) {
            const newTeacherId = generateTeacherId();
            await setDoc(userRef, { teacherId: newTeacherId }, { merge: true });
            data.teacherId = newTeacherId;
          }
          setUserData(data);
          setIsShining(true);
          setTimeout(() => setIsShining(false), 1000);

          if (role === "student") {
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
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .filter((ann, index, self) => 
                index === self.findIndex((a) => a.id === ann.id)
              );

            const viewedAnnouncements = data.viewedAnnouncements || [];
            const newCount = announcementList.filter((ann) => !viewedAnnouncements.includes(ann.id)).length;
            setNewNotifications(newCount);
          }
        } catch (err) {
          console.error("Error in Sidebar useEffect:", err);
          setError("Failed to load user data: " + err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setError("User is not authenticated. Please log in.");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [role]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const navItems = [
    { 
      name: "Dashboard", 
      path: `/${role}-dashboard`, 
      icon: <FiHome />,
      matchExact: true
    },
    ...(role === "teacher"
      ? [
          { name: "Create Exam", path: "/teacher-dashboard/create-exam", icon: <FiPlus /> },
          { name: "View Results", path: "/teacher-dashboard/results", icon: <FiBarChart2 /> },
          { name: "Exam Students", path: "/teacher-dashboard/students", icon: <FiUsers /> },
          { name: "Announcements", path: "/teacher-dashboard/announcements", icon: <FiBell /> },
        ]
      : [
          { name: "View Results", path: "/student-dashboard/results", icon: <FiBarChart2 /> },
          { name: "Notifications", path: "/student-dashboard/notifications", icon: (
            <div className="relative">
              <FiBell />
              {newNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {newNotifications}
                </span>
              )}
            </div>
          ) },
        ]),
    { name: "Profile", path: `/${role}-dashboard/profile`, icon: <FiUser /> },
  ];

  const isActiveItem = (item) => {
    if (item.matchExact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  if (loading) {
    return (
      <div className="h-full w-64 bg-[var(--secondary-bg)] p-4 flex items-center justify-center">
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
      <div className="h-full w-64 bg-[var(--secondary-bg)] p-4 text-[var(--text-primary)]">
        <p>{error}</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 px-4 py-2 bg-[var(--accent)] text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="h-full w-64 bg-[var(--secondary-bg)] p-4 text-[var(--text-primary)]">
        Error loading user data
      </div>
    );
  }

  return (
    <>
      {/* Sidebar Container */}
      <div 
        className={`fixed top-0 left-0 h-full ${isOpen ? 'w-64' : 'w-0'} z-20`}
        onMouseEnter={() => window.innerWidth >= 640 && setIsHovered(true)}
        onMouseLeave={() => window.innerWidth >= 640 && setIsHovered(false)}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-full w-64 bg-[var(--secondary-bg)] text-[var(--text-primary)] p-4 flex flex-col shadow-xl relative overflow-hidden"
            >
              <div className="flex flex-col items-center mb-8">
                <div className="relative w-24 h-24 mb-4 group">
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-1 shadow-lg ${
                    isShining ? "animate-shine" : ""
                  }`}>
                    {userData.profilePicture ? (
                      <img
                        src={userData.profilePicture}
                        alt="Profile"
                        className="w-full h-full rounded-full bg-[var(--secondary-bg)] object-cover border-2 border-white/20"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[var(--primary-bg)] flex items-center justify-center border-2 border-white/20">
                        <span className="text-3xl font-medium text-[var(--text-primary)]">
                          {userData.firstName[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  {isShining && (
                    <div className="absolute inset-0 rounded-full bg-blue-400/20 blur-md animate-pulse"></div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-center">
                  {userData.firstName} {userData.surname}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {role === "teacher"
                    ? `Teacher ID: ${userData.teacherId}`
                    : `Reg No: ${userData.registrationNumber}`}
                </p>
                {role === "student" && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Class: {userData.class}
                  </p>
                )}
              </div>

              <div className="w-full h-px bg-[var(--border)] mb-6"></div>

              <ul className="flex-1 w-full space-y-1">
                {navItems.map((item, idx) => (
                  <motion.li
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * idx, duration: 0.3 }}
                    whileHover={{ scale: 1.02 }}
                    className="w-full"
                  >
                    <button
                      onClick={() => navigate(item.path)}
                      className={`flex items-center p-3 rounded-lg w-full text-left transition-all ${
                        isActiveItem(item)
                          ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                          : "hover:bg-[var(--primary-bg)]"
                      }`}
                    >
                      <span className="w-6 flex justify-center text-lg">{item.icon}</span>
                      <span className="ml-3">{item.name}</span>
                    </button>
                  </motion.li>
                ))}
              </ul>

              <motion.div 
                whileHover={{ scale: 1.02 }} 
                className="mt-auto pt-4 border-t border-[var(--border)]"
              >
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                >
                  <FiLogOut className="w-6 text-lg" />
                  <span className="ml-3">Logout</span>
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Button - Always Present with Dynamic Positioning */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-[var(--secondary-bg)] shadow-lg border border-[var(--border)] w-10 h-10 flex items-center justify-center`}
        animate={{ left: isOpen ? '16rem' : '1rem' }} // 16rem = 256px (w-64), 1rem = 16px
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        <motion.div
          animate={{ rotate: isOpen ? 0 : 180 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <FiChevronRight className="text-[var(--text-primary)]" size={20} />
        </motion.div>
      </motion.button>
    </>
  );
};

export default Sidebar;