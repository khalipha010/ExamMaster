import { useState, useContext } from 'react';
import { FaCamera, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { ThemeContext } from '../../context/ThemeContext';

const AvatarUpload = ({ onChange, currentAvatar }) => {
  const [preview, setPreview] = useState(currentAvatar || null);
  const { theme } = useContext(ThemeContext);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onChange(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center relative"
    >
      <label className="relative cursor-pointer group">
        <div className={`relative w-24 h-24 rounded-full overflow-hidden 
          backdrop-blur-sm border-2 border-white/20 dark:border-black/20
          shadow-md group-hover:border-[var(--accent)] transition-all duration-300
          ${preview ? 'ring-2 ring-offset-2 ring-[var(--accent)] ring-offset-[var(--secondary-bg)]' : ''}
          ${theme === 'dark' ? 'bg-black/20' : 'bg-white/20'}`}>
          
          {preview ? (
            <img
              src={preview}
              alt="Profile preview"
              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-300"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center 
              backdrop-blur-sm ${theme === 'dark' ? 'bg-black/10' : 'bg-white/10'}`}>
              <FaUser className={`text-[var(--text-secondary)] text-3xl transition-colors duration-300 ${
                theme === 'dark' ? 'opacity-80' : 'opacity-60'
              }`} />
            </div>
          )}
        </div>
        <motion.div
          className={`absolute bottom-0 right-0 rounded-full p-2 border-2 
            ${theme === 'dark' ? 'border-black/20' : 'border-white/20'} shadow-lg
            backdrop-blur-sm ${theme === 'dark' ? 'bg-indigo-600/80' : 'bg-blue-500/80'}`}
          whileHover={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          {preview ? (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <FaCamera className="text-white text-sm" />
          )}
        </motion.div>
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
    </motion.div>
  );
};

export default AvatarUpload;