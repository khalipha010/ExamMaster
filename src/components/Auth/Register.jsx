import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../../firebase/auth';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { motion, AnimatePresence } from 'framer-motion';
import AvatarUpload from '../UI/AvatarUpload';
import { ThemeContext } from '../../context/ThemeContext';
import { FaSpinner, FaArrowRight, FaUserTie, FaUserGraduate } from 'react-icons/fa';
import ThemeToggle from '../UI/ThemeToggle';
import ParticlesComponent from '../Particles';

const Register = () => {
  const [role, setRole] = useState('teacher');
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    otherName: '',
    dob: '',
    class: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const classes = Array.from({ length: 12 }, (_, i) => `Basic ${i + 1}`);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAvatarChange = (file) => {
    setFormData({ ...formData, avatar: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const userData = {
        firstName: formData.firstName,
        surname: formData.surname,
        otherName: formData.otherName || null,
        ...(role === 'student' && { dob: formData.dob, class: formData.class }),
      };
      const { user } = await registerUser(formData.email, formData.password, role, userData);

      let profilePictureUrl = null;
      if (formData.avatar) {
        profilePictureUrl = await uploadImageToCloudinary(
          formData.avatar,
          'Profile_picture',
          user.uid
        );
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../../firebase/config');
        await setDoc(doc(db, 'users', user.uid), { profilePicture: profilePictureUrl }, { merge: true });
      }

      navigate(role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-4 sm:p-8 transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 to-gray-800'
        : 'bg-gradient-to-br from-blue-50 to-indigo-50'
    }`}>
      {/* Particles Background */}
      <ParticlesComponent id="tsparticles" className="absolute inset-0 z-0" />

      <div className="fixed top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full max-w-2xl rounded-2xl p-8 relative z-10 overflow-hidden 
            backdrop-blur-sm bg-white/10 dark:bg-black/10 
            border border-white/20 dark:border-black/20 
            shadow-xl"
        >
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-8"
            >
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center 
                  backdrop-blur-sm border border-white/20 dark:border-black/20
                  ${theme === 'dark' 
                    ? 'bg-indigo-600/80 shadow-[0_4px_14px_rgba(79,70,229,0.4)]' 
                    : 'bg-blue-500/80 shadow-[0_4px_14px_rgba(59,130,246,0.3)]'
                  }`}
              >
                {role === 'teacher' ? (
                  <FaUserTie className="w-10 h-10 text-white" />
                ) : (
                  <FaUserGraduate className="w-10 h-10 text-white" />
                )}
              </div>
            </motion.div>

            <h2 className={`text-3xl font-bold text-center mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Create Account
            </h2>
            <p className={`text-center mb-8 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Join as a {role} to get started
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Role
                  </label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 
                        backdrop-blur-sm border border-white/20 dark:border-black/20
                        ${theme === 'dark' 
                          ? 'bg-black/20 text-white placeholder-gray-400 focus:ring-blue-500' 
                          : 'bg-white/20 text-gray-800 placeholder-gray-500 focus:ring-blue-400'
                        } appearance-none`}
                    >
                      <option value="teacher">Teacher</option>
                      <option value="student">Student</option>
                    </select>
                    <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center"
                >
                  <AvatarUpload onChange={handleAvatarChange} theme={theme} />
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['firstName', 'surname', 'otherName'].map((field, idx) => (
                  <motion.div
                    key={field}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                  >
                    <label
                      htmlFor={field}
                      className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      {field === 'otherName'
                        ? 'Other Name (Optional)'
                        : `${field.charAt(0).toUpperCase() + field.slice(1)}`}
                    </label>
                    <input
                      id={field}
                      type="text"
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 
                        backdrop-blur-sm border border-white/20 dark:border-black/20
                        ${theme === 'dark' 
                          ? 'bg-black/20 text-white placeholder-gray-400 focus:ring-blue-500' 
                          : 'bg-white/20 text-gray-800 placeholder-gray-500 focus:ring-blue-400'
                        }`}
                      required={field !== 'otherName'}
                    />
                  </motion.div>
                ))}
              </div>

              {role === 'student' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <label
                      htmlFor="dob"
                      className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Date of Birth
                    </label>
                    <input
                      id="dob"
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 
                        backdrop-blur-sm border border-white/20 dark:border-black/20
                        ${theme === 'dark' 
                          ? 'bg-black/20 text-white placeholder-gray-400 focus:ring-blue-500' 
                          : 'bg-white/20 text-gray-800 placeholder-gray-500 focus:ring-blue-400'
                        }`}
                      required
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 }}
                  >
                    <label
                      htmlFor="class"
                      className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      Class
                    </label>
                    <div className="relative">
                      <select
                        id="class"
                        name="class"
                        value={formData.class}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 
                          backdrop-blur-sm border border-white/20 dark:border-black/20
                          ${theme === 'dark' 
                            ? 'bg-black/20 text-white placeholder-gray-400 focus:ring-blue-500' 
                            : 'bg-white/20 text-gray-800 placeholder-gray-500 focus:ring-blue-400'
                          } appearance-none`}
                        required
                      >
                        <option value="">Select Class</option>
                        {classes.map((className) => (
                          <option key={className} value={className}>
                            {className}
                          </option>
                        ))}
                      </select>
                      <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['email', 'password', 'confirmPassword'].map((field, idx) => (
                  <motion.div
                    key={field}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (role === 'student' ? 1.0 : 0.8) + idx * 0.1 }}
                  >
                    <label
                      htmlFor={field}
                      className={`block text-sm font-medium mb-1 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}
                    >
                      {field === 'confirmPassword'
                        ? 'Confirm Password'
                        : field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <input
                      id={field}
                      type={field === 'email' ? 'email' : 'password'}
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 
                        backdrop-blur-sm border border-white/20 dark:border-black/20
                        ${theme === 'dark' 
                          ? 'bg-black/20 text-white placeholder-gray-400 focus:ring-blue-500' 
                          : 'bg-white/20 text-gray-800 placeholder-gray-500 focus:ring-blue-400'
                        }`}
                      required
                    />
                  </motion.div>
                ))}
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`p-3 rounded-lg text-sm 
                      backdrop-blur-sm border border-white/20 dark:border-black/20
                      ${theme === 'dark' 
                        ? 'bg-red-900/20 text-red-300' 
                        : 'bg-red-100/20 text-red-600'
                      }`}>
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className={`w-full px-6 py-4 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group ${
                  theme === 'dark' 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/30' 
                    : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Register Now</span>
                    <FaArrowRight className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </motion.button>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className={`text-center text-sm ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Already have an account?{' '}
                <a
                  href="/login"
                  className={`font-medium hover:underline ${
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  }`}
                >
                  Login here
                </a>
              </motion.div>
            </form>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Register;