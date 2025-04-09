import { useEffect, useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FaSpinner } from 'react-icons/fa';
import { ThemeContext } from '../context/ThemeContext';

const ProtectedRoute = ({ children, allowedRole }) => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--primary-bg)]">
        <FaSpinner className="animate-spin text-[var(--accent)] text-4xl" />
      </div>
    );
  }

  if (!auth.currentUser) {
    return <Navigate to="/" />; // Unauthenticated → /login
  }

  if (userRole !== allowedRole) {
    return <Navigate to="/" />; // Role mismatch → / (home)
  }

  return children;
};

export default ProtectedRoute;