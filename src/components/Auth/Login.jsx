import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../../context/ThemeContext';
import { FaSpinner, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa';
import ThemeToggle from '../UI/ThemeToggle';
import ParticlesComponent from '../Particles';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Incorrect email or password';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/invalid-credential':
        return 'Incorrect email or password';
      default:
        return 'Login failed. Please try again';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await loginUser(email, password);
      if (!result || !result.role) {
        throw new Error('Role not found in login response');
      }
      const { role } = result;
      navigate(role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const friendlyError = getFriendlyErrorMessage(err.code || err.message);
      setError(friendlyError);
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
          className="w-full max-w-md rounded-2xl p-8 relative z-10 overflow-hidden 
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
                className={`w-16 h-16 rounded-2xl flex items-center justify-center 
                  backdrop-blur-sm border border-white/20 dark:border-black/20
                  ${theme === 'dark' 
                    ? 'bg-indigo-600/80 shadow-[0_4px_14px_rgba(79,70,229,0.4)]' 
                    : 'bg-blue-500/80 shadow-[0_4px_14px_rgba(59,130,246,0.3)]'
                  }`}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                  />
                </svg>
              </div>
            </motion.div>

            <h2 className={`text-3xl font-bold text-center mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Welcome Back
            </h2>
            <p className={`text-center mb-8 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Sign in to access your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label
                  htmlFor="email"
                  className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 
                      backdrop-blur-sm border border-white/20 dark:border-black/20
                      ${theme === 'dark' 
                        ? 'bg-black/20 text-white placeholder-gray-400 focus:ring-blue-500' 
                        : 'bg-white/20 text-gray-800 placeholder-gray-500 focus:ring-blue-400'
                      }`}
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label
                  htmlFor="password"
                  className={`block text-sm font-medium mb-1 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 pr-12
                      backdrop-blur-sm border border-white/20 dark:border-black/20
                      ${theme === 'dark' 
                        ? 'bg-black/20 text-white placeholder-gray-400 focus:ring-blue-500' 
                        : 'bg-white/20 text-gray-800 placeholder-gray-500 focus:ring-blue-400'
                      }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </motion.div>

              <div className="flex items-center justify-between">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center"
                >
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className={`h-4 w-4 rounded focus:ring-0 ${
                      theme === 'dark' 
                        ? 'bg-black/20 border-gray-600 text-blue-500' 
                        : 'bg-white/20 border-gray-300 text-blue-500'
                    } border`}
                  />
                  <label
                    htmlFor="remember-me"
                    className={`ml-2 block text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Remember me
                  </label>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <button
                    type="button"
                    onClick={() => navigate('/reset-password')}
                    className={`text-sm hover:underline ${
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    }`}
                  >
                    Forgot password?
                  </button>
                </motion.div>
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
                className={`w-full px-6 py-3 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group ${
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <FaArrowRight className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </motion.button>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className={`mt-6 text-center text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className={`font-medium hover:underline ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}
              >
                Create one
              </button>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
export default Login;