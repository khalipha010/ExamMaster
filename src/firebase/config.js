import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCqkYexd38ypj18kocG2MYGq6NRfAhDUT0",
  authDomain: "examination-app-fb1d9.firebaseapp.com",
  projectId: "examination-app-fb1d9",
  storageBucket: "examination-app-fb1d9.firebasestorage.app",
  messagingSenderId: "710488962400",
  appId: "1:710488962400:web:a96648eb6b0c5b01e59a05",
  measurementId: "G-7KQ42YJ47G",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);