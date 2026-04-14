// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWweyI2BcMeYIxGUKsVzwFD_bwnk_n8UQ",
  authDomain: "event-management-platfor-79492.firebaseapp.com",
  projectId: "event-management-platfor-79492",
  storageBucket: "event-management-platfor-79492.firebasestorage.app",
  messagingSenderId: "565234989814",
  appId: "1:565234989814:web:e1359e687f34ed38c9cad7",
  measurementId: "G-09GDYX1DQG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);