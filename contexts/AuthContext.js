"use client"

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
  const isBrowser = typeof window !== 'undefined';
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // SIMPLIFIED SIGNUP FUNCTION - focus on auth only first
  const signup = async (email, password, name) => {
    console.log("Signup attempt with:", email);
    
    try {
      // Just focus on auth first, we'll add Firestore later
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Auth creation successful");
      
      const user = userCredential.user;
      console.log("User created:", user.uid);
      
      // Try to add to Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          name,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log("Firestore document created");
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        // Continue anyway, focus on auth
      }
      
      // Skip token for now
      return user;
    } catch (error) {
      console.error("Signup error:", error);
      throw new Error(error.message || "Signup failed");
    }
  };

  // Simplify login too
  const login = async (email, password) => {
    console.log("Login attempt with:", email);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful");
      return userCredential;
    } catch (error) {
      console.error("Login error:", error);
      throw new Error(error.message || "Login failed");
    }
  };

  // Basic logout function
  const logout = async () => {
    console.log("Logout attempt");
    try {
      await signOut(auth);
      console.log("Logout successful");
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  // Simple reset password
  const resetPassword = (email) => {
    console.log("Password reset for:", email);
    return sendPasswordResetEmail(auth, email);
  };

  // Get user data
  const getUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Auth state listener
  useEffect(() => {
    console.log("Setting up auth listener");
    
    if (!isBrowser) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? "User exists" : "No user");
      
      if (user) {
        try {
          const userData = await getUserData(user.uid);
          setCurrentUser({ ...user, ...userData });
        } catch (error) {
          console.error("Error in auth state change:", error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
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
      {children}
    </AuthContext.Provider>
  );
};