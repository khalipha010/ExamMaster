import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  // Animation variants
  const iconVariants = {
    initial: { opacity: 0, scale: 0.5, rotate: -45 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      rotate: 0,
      transition: { type: 'spring', stiffness: 500, damping: 15 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.5, 
      rotate: 45,
      transition: { duration: 0.2 }
    }
  };

  const buttonVariants = {
    rest: { 
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
      scale: 1
    },
    hover: { 
      scale: 1.1,
      boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.15)'
    },
    tap: { 
      scale: 0.95,
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)'
    }
  };

  return (
    <motion.div
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.button
        onClick={toggleTheme}
        className="group p-1 rounded-full flex items-center justify-center bg-gray-700/70 hover:bg-gray-600/80 transition-colors"
        variants={buttonVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        aria-label="Toggle theme"
        style={{
          width: '2.5rem',
          height: '2.5rem',
        }}
      >
        {/* Icon container with subtle dark background */}
        <div className="w-8 h-8 rounded-full bg-gray-600/70 group-hover:bg-gray-500/80 flex items-center justify-center p-2 transition-colors">
          <div className="relative w-5 h-5">
            <AnimatePresence mode="wait">
              {theme === 'dark' ? (
                <motion.span
                  key="sun"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <FiSun className="w-full h-full text-yellow-300 drop-shadow-[0_0_4px_rgba(253,224,71,0.4)]" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  variants={iconVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <FiMoon className="w-full h-full text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.3)]" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.button>

      {/* Floating label */}
      <motion.div 
        className="absolute right-10 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-gray-600/80 text-yellow-300 backdrop-blur-sm"
        initial={{ opacity: 0, x: -10 }}
        animate={{ 
          opacity: 1, 
          x: 0,
        }}
        transition={{ delay: 0.4 }}
      >
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </motion.div>
    </motion.div>
  );
};

export default ThemeToggle;