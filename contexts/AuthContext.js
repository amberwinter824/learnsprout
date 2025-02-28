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
      console.log("Starting signup process...");
      
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created in Firebase Auth");
      
      // Create a user document in Firestore
      const user = userCredential.user;
      if (user) {
        console.log("Creating Firestore document for user:", user.uid);
        await setDoc(doc(db, 'users', user.uid), {
          name,
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Set token in cookie
        if (isBrowser) {
          try {
            console.log("Setting token cookie");
            const token = await user.getIdToken();
            Cookies.set('token', token, { expires: 7 });
          } catch (tokenError) {
            console.error("Error setting token:", tokenError);
          }
        }
      }
      
      return user;
    } catch (error) {
      console.error("Signup error:", error);
      // Enhanced error handling
      const errorMessage = error.message || "Unknown error occurred";
      throw new Error(errorMessage);
    }
  };

  // Sign in function
  const login = async (email, password) => {
    try {
      console.log("Starting login process...");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User signed in");
      
      // Set token in cookie
      if (isBrowser) {
        try {
          console.log("Setting token cookie");
          const token = await userCredential.user.getIdToken();
          Cookies.set('token', token, { expires: 7 });
        } catch (tokenError) {
          console.error("Error setting token:", tokenError);
        }
      }
      
      return userCredential;
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error.message || "Failed to sign in";
      throw new Error(errorMessage);
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      console.log("Starting logout process...");
      await signOut(auth);
      console.log("User signed out");
      
      // Remove the cookie
      if (isBrowser) {
        console.log("Removing token cookie");
        Cookies.remove('token');
      }
      
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  // Reset password function
  const resetPassword = (email) => {
    console.log("Sending password reset email to:", email);
    return sendPasswordResetEmail(auth, email)
      .then(() => {
        console.log("Password reset email sent successfully");
      })
      .catch((error) => {
        console.error("Error sending password reset:", error);
        throw error;
      });
  };

  // Get user data from Firestore
  const getUserData = async (uid) => {
    try {
      console.log("Fetching user data for:", uid);
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        console.log("User data found");
        return userDoc.data();
      }
      console.log("No user data found");
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state listener");
    
    if (!isBrowser) {
      console.log("Not in browser environment, skipping auth listener");
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? "User authenticated" : "No user");
      
      if (user) {
        try {
          const userData = await getUserData(user.uid);
          console.log("Combined user data with auth data");
          setCurrentUser({ ...user, ...userData });
          
          // Set token in cookie
          try {
            console.log("Setting token cookie on auth state change");
            const token = await user.getIdToken();
            Cookies.set('token', token, { expires: 7 });
          } catch (tokenError) {
            console.error("Error setting token on auth state change:", tokenError);
          }
        } catch (error) {
          console.error("Error in auth state change handler:", error);
        }
      } else {
        console.log("Clearing current user and token");
        setCurrentUser(null);
        Cookies.remove('token');
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });

    return () => {
      console.log("Cleaning up auth state listener");
      unsubscribe();
    };
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