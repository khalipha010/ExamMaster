import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeContext } from '../context/ThemeContext';
import ThemeToggle from './UI/ThemeToggle';
import ParticlesComponent from './Particles';

const Home = () => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  return (
    <div className="relative min-h-screen flex flex-col items-center p-4 overflow-hidden">
      {/* Particles Background */}
      <ParticlesComponent id="tsparticles" className="absolute inset-0 z-0" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mx-auto backdrop-blur-sm bg-white/10 dark:bg-black/10 p-8 sm:p-10 rounded-2xl border border-white/20 dark:border-black/20 shadow-xl w-full mb-8"
        >
          {/* Headline */}
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-6 leading-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Welcome to <span className="text-[var(--accent)]">ExamMaster</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-[var(--text-secondary)] mb-10 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Streamline your exam experience with our intuitive platform.
          </motion.p>

          {/* Features */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { icon: '📝', title: 'Create Exams', text: 'Design custom exams in minutes' },
              { icon: '📊', title: 'Track Progress', text: 'Monitor student performance' },
              { icon: '🎯', title: 'Smart Grading', text: 'Automated scoring system' }
            ].map((feature, index) => (
              <div key={index} className="bg-white/10 dark:bg-black/10 p-6 rounded-xl border border-white/20 dark:border-black/20">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                <p className="text-[var(--text-secondary)]">{feature.text}</p>
              </div>
            ))}
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-16"
          >
            <motion.button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-[var(--accent)] text-white text-lg font-semibold rounded-xl hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started Now
              <span className="ml-2">→</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Sticky Footer Badge with Two-Color Horizontal Shine */}
      <motion.div
        className="w-full py-6 z-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <div className="flex justify-center">
          <a
            href="https://khaliphajibreel.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="relative group overflow-hidden"
          >
            {/* Two-Color Horizontal Shine Effect */}
            <motion.div
              className="absolute inset-0 h-full w-1/2"
              animate={{
                x: ['-50%', '150%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.7), rgba(99, 102, 241, 0.7), transparent)'
              }}
            />
            
            {/* Main badge */}
            <motion.div
              className="relative flex items-center gap-2 bg-white/5 dark:bg-black/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 dark:border-black/20"
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)"
              }}
            >
              {/* Animated particles */}
              <motion.div
                className="absolute inset-0 opacity-20 group-hover:opacity-40"
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"]
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "linear"
                }}
                style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '10px 10px'
                }}
              />
              
              {/* Content */}
              <motion.div
                className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--accent)] to-blue-500 flex items-center justify-center"
                animate={{
                  rotate: [0, 15, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </motion.div>
              
              <motion.span
                className="text-sm font-medium text-[var(--text-primary)]"
                animate={{
                  x: [0, 2, -2, 0]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity
                }}
              >
                Created by <span className="font-bold text-[var(--accent)]">Khalipha-Jibreel</span>
              </motion.span>
              
              <motion.div
                className="ml-1 text-[var(--accent)]"
                animate={{
                  opacity: [0.6, 1, 0.6],
                  scale: [1, 1.2, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity
                }}
              >
                ✨
              </motion.div>
            </motion.div>
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;