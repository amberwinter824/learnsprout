"use client"

// contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Add check for window to handle SSR
  const isBrowser = typeof window !== 'undefined';
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sign up function
  const signup = async (email, password, name) => {
    try {
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create a user document in Firestore
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Set token in cookie
      if (isBrowser) {
        const token = await user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  // Sign in function
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Set token in cookie
      if (isBrowser) {
        const token = await userCredential.user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
      }
      
      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      await signOut(auth);
      // Remove the cookie
      if (isBrowser) {
        Cookies.remove('token');
      }
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      throw error;
    }
  };

  // Reset password function
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Get user data from Firestore
  const getUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    if (!isBrowser) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await getUserData(user.uid);
        setCurrentUser({ ...user, ...userData });
        
        // Set token in cookie
        try {
          const token = await user.getIdToken();
          Cookies.set('token', token, { expires: 7 });
        } catch (error) {
          console.error("Error setting auth token:", error);
        }
      } else {
        setCurrentUser(null);
        Cookies.remove('token');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [isBrowser]);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    getUserData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {(!loading || !isBrowser) && children}
    </AuthContext.Provider>
  );
};