import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Define inline styles to ensure LTR direction with high specificity
const styles = {
  textarea: {
    direction: 'ltr !important',
    textAlign: 'left !important',
    unicodeBidi: 'embed !important',
  },
};

const FlagModal = memo(
  ({ flaggingStudent, flagReason, setFlagReason, handleSubmitFlag, handleCancelFlag, theme }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, []);

    const handleChange = (e) => {
      const newValue = e.target.value;
      console.log('Textarea input:', newValue); // Debug the input
      setFlagReason(newValue);
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`p-6 rounded-xl shadow-lg max-w-md w-full mx-4 ${
            theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <h3
            className={`text-xl font-bold mb-4 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
            }`}
          >
            Flag Student for Review
          </h3>
          <p
            className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Please provide a reason for flagging {flaggingStudent?.firstName}{' '}
            {flaggingStudent?.surname}.
          </p>
          <textarea
            ref={textareaRef}
            value={flagReason}
            onChange={handleChange}
            placeholder="Enter reason for flagging..."
            className={`w-full p-2 rounded-md mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'bg-gray-100 border-gray-300 text-gray-800'
            }`}
            style={styles.textarea}
            rows="4"
          />
          <div className="flex justify-end gap-2">
            <motion.button
              onClick={handleCancelFlag}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'
              } text-gray-800 dark:text-gray-200 transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleSubmitFlag}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
              } text-white transition-colors`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Submit
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

export default FlagModal;