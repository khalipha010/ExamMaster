import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { deleteUser, onAuthStateChanged } from 'firebase/auth';
import { uploadImageToCloudinary } from '../../utils/cloudinary';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../../context/ThemeContext';
import { FaSpinner } from 'react-icons/fa';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import ThemeToggle from '../UI/ThemeToggle';
import AvatarUpload from '../UI/AvatarUpload';

const ProfileUpdate = ({ role }) => {
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    otherName: '',
    dob: '',
    class: '',
    avatar: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const classes = Array.from({ length: 12 }, (_, i) => `Basic ${i + 1}`);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setFormData({
              firstName: data.firstName || '',
              surname: data.surname || '',
              otherName: data.otherName || '',
              dob: data.dob || '',
              class: data.class || '',
              avatar: null,
            });
          }
        } catch (err) {
          console.error('Error loading user data:', err);
          setError('Failed to load profile data');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAvatarChange = (file) => {
    setFormData({ ...formData, avatar: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let profilePictureUrl = userData.profilePicture || '';
      if (formData.avatar && formData.avatar instanceof File) {
        profilePictureUrl = await uploadImageToCloudinary(formData.avatar, 'Profile_picture');
      }
      
      const updatedData = {
        firstName: formData.firstName,
        surname: formData.surname,
        otherName: formData.otherName || null,
        profilePicture: profilePictureUrl,
        ...(role === 'student' && { 
          dob: formData.dob, 
          class: formData.class 
        }),
      };

      await setDoc(doc(db, 'users', auth.currentUser.uid), updatedData, { merge: true });
      navigate(`/${role}-dashboard`);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid));
        await deleteUser(auth.currentUser);
        navigate('/login');
      } catch (err) {
        console.error('Error deleting account:', err);
        setError('Failed to delete account. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (!userData) {
    return (
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
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-200 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`rounded-xl shadow-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
        >
          <div className="p-6 sm:p-8">
            <h2 className={`text-2xl font-bold font-display mb-6 text-center ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
              Update Profile
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center mb-6">
                <AvatarUpload 
                  onChange={handleAvatarChange} 
                  currentAvatar={userData.profilePicture} 
                />
              </div>

              <div className="space-y-4">
                {['firstName', 'surname', 'otherName'].map((field, idx) => (
                  <motion.div
                    key={field}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
                  >
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {field === 'otherName' ? 'Other Name (Optional)' : `${field.charAt(0).toUpperCase() + field.slice(1)}`}
                    </label>
                    <input
                      type="text"
                      name={field}
                      value={formData[field]}
                      onChange={handleChange}
                      className={`w-full p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-800 placeholder-gray-500'}`}
                      required={field !== 'otherName'}
                    />
                  </motion.div>
                ))}
              </div>

              {role === 'student' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div 
                    className={`p-4 rounded-lg cursor-pointer ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        Additional Information
                      </h3>
                      {isExpanded ? (
                        <FiChevronUp className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      ) : (
                        <FiChevronDown className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 mt-4">
                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              name="dob"
                              value={formData.dob}
                              onChange={handleChange}
                              className={`w-full p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'}`}
                              required
                            />
                          </div>

                          <div>
                            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              Class
                            </label>
                            <select
                              name="class"
                              value={formData.class}
                              onChange={handleChange}
                              className={`w-full p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'}`}
                              required
                            >
                              <option value="">Select Class</option>
                              {classes.map((className) => (
                                <option key={className} value={className}>
                                  {className}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-600'}`}
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-3">
                <motion.button
                  type="submit"
                  className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 ${loading ? 'bg-blue-400' : (theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')} text-white transition-colors`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  {loading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    'Update Profile'
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleDeleteAccount}
                  className={`w-full p-3 rounded-lg ${theme === 'dark' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  Delete Account
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
      <ThemeToggle />
    </div>
  );
};

export default ProfileUpdate;