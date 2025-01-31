import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCDiKmkR5UqQvFFxIXR_fWjH3vSqjNFkVQ",
    authDomain: "pinhigh-58fb3.firebaseapp.com",
    projectId: "pinhigh-58fb3",
    storageBucket: "pinhigh-58fb3.firebasestorage.app",
    messagingSenderId: "134583879743",
    appId: "1:134583879743:web:4f9512fc207b8a1b6a508a",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
