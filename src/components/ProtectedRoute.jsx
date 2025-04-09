import { useEffect, useState, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FaSpinner } from 'react-icons/fa';
import { ThemeContext } from '../context/ThemeContext';

const ProtectedRoute = ({ children, allowedRole }) => {
  const [userRole, setUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        } else {
          console.error('User document not found in Firestore');
          setUserRole(null);
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
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

  if (!isAuthenticated) {
    return <Navigate to="/login" />; // Unauthenticated → /login
  }

  if (userRole === null) {
    return <Navigate to="/login" />; // User document not found → /login
  }

  if (userRole !== allowedRole) {
    return <Navigate to={userRole === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'} />;
  }

  return children;
};

export default ProtectedRoute;