import { auth, db } from './config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Function to generate a random 5-digit number
const generateRandomId = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Register a new user
export const registerUser = async (email, password, role, userData) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  const userDoc = {
    email,
    role,
    ...userData,
  };

  // Generate a registration number for students or a teacher ID for teachers
  if (role === 'student') {
    userDoc.registrationNumber = `STU-${generateRandomId()}`;
  } else if (role === 'teacher') {
    userDoc.teacherId = `TCH-${generateRandomId()}`;
  }

  await setDoc(doc(db, 'users', user.uid), userDoc);

  return { user, userDoc };
};

// Login an existing user
export const loginUser = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);

  // Fetch the user's role from Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    throw new Error('User data not found in Firestore');
  }

  const userData = userDoc.data();
  return { user, role: userData.role };
};

// Send a password reset email
export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};