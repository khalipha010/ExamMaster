import { useState, useContext } from 'react';
import { resetPassword } from '../../firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../../context/ThemeContext';
import { FaSpinner, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import ThemeToggle from '../UI/ThemeToggle';
import ParticlesComponent from '../Particles';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await resetPassword(email);
      setMessage('Password reset email sent! Check your inbox.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-4 sm:p-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-blue-50 to-indigo-50'
    }`}>
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
          className="w-full max-w-md rounded-2xl p-8 relative z-10 overflow-hidden backdrop-blur-sm bg-white/10 dark:bg-black/10 border border-white/20 dark:border-black/20 shadow-xl"
        >
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-8"
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 dark:border-black/20 ${
                  theme === 'dark' ? 'bg-indigo-600/80 shadow-[0_4px_14px_rgba(79,70,229,0.4)]' : 'bg-blue-500/80 shadow-[0_4px_14px_rgba(59,130,246,0.3)]'
                }`}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </motion.div>

            <h2 className={`text-3xl font-bold text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              Reset Password
            </h2>
            <p className={`text-center mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Enter your email to receive a reset link
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <label htmlFor="email" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent transition-all duration-200 backdrop-blur-sm border border-white/20 dark:border-black/20 ${
                      theme === 'dark' ? 'bg-black/20 text-white placeholder-gray-400 focus:ring-blue-500' : 'bg-white/20 text-gray-800 placeholder-gray-500 focus:ring-blue-400'
                    }`}
                    required
                  />
                </div>
              </motion.div>

              <AnimatePresence>
                {message && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className={`p-3 rounded-lg text-sm flex items-center backdrop-blur-sm border border-white/20 dark:border-black/20 ${
                      theme === 'dark' ? 'bg-green-900/20 text-green-300' : 'bg-green-100/20 text-green-600'
                    }`}>
                      <FaCheckCircle className="mr-2" />
                      {message}
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className={`p-3 rounded-lg text-sm backdrop-blur-sm border border-white/20 dark:border-black/20 ${
                      theme === 'dark' ? 'bg-red-900/20 text-red-300' : 'bg-red-100/20 text-red-600'
                    }`}>
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className={`w-full px-6 py-3 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 group ${
                  theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/30' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || message}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                  </>
                )}
              </motion.button>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className={`mt-6 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
            >
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`font-medium hover:underline flex items-center justify-center ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}
              >
                <FaArrowLeft className="mr-2" />
                Back to Login
              </button>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ResetPassword;