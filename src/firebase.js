// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWweyI2BcMeYIxGUKsVzwFD_bwnk_n8UQ",
  authDomain: "event-management-platfor-79492.firebaseapp.com",
  projectId: "event-management-platfor-79492",
  storageBucket: "event-management-platfor-79492.firebasestorage.app",
  messagingSenderId: "565234989814",
  appId: "1:565234989814:web:e1359e687f34ed38c9cad7",
  measurementId: "G-09GDYX1DQG"
};

// Initialize Firebase with error handling
let app;
let db;
let auth;
let storage;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  analytics = getAnalytics(app);
  
  // Enable offline persistence for Firestore (optional but recommended)
  try {
    db.enablePersistence?.();
  } catch (err) {
    console.warn('Offline persistence error:', err);
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
  console.error('Please ensure Firebase Authentication is enabled in your Firebase Console');
}

export { db, auth, storage, analytics };