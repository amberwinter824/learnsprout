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
      console.log("Signup started with email:", email);
      
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create a user document in Firestore
      const user = userCredential.user;
      console.log("User created:", user.uid);
      
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log("User document created in Firestore");
      
      // Set token in cookie
      if (isBrowser) {
        const token = await user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
      }
      
      // Set the current user immediately instead of waiting for onAuthStateChanged
      const userData = { name, email };
      setCurrentUser({ ...user, ...userData });
      console.log("Current user set in state:", user.uid);
      
      return user;
    } catch (error) {
      console.error("Error in signup:", error);
      throw error;
    }
  };

  // Sign in function
  const login = async (email, password) => {
    try {
      console.log("Login started with email:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Get user data from Firestore
      const userData = await getUserData(userCredential.user.uid);
      console.log("User data retrieved:", userData);
      
      // Set current user immediately instead of waiting for onAuthStateChanged
      setCurrentUser({ ...userCredential.user, ...userData });
      
      // Set token in cookie
      if (isBrowser) {
        const token = await userCredential.user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
      }
      
      return userCredential;
    } catch (error) {
      console.error("Error in login:", error);
      throw error;
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      console.log("Logout started");
      await signOut(auth);
      // Remove the cookie
      if (isBrowser) {
        Cookies.remove('token');
      }
      // Clear user state immediately
      setCurrentUser(null);
      console.log("User logged out, state cleared");
      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error("Error in logout:", error);
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
      console.log("Getting user data for:", uid);
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data found:", userData);
        return userData;
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
    if (!isBrowser) {
      setLoading(false);
      return;
    }
    
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? "User signed in" : "No user");
      
      if (user) {
        try {
          const userData = await getUserData(user.uid);
          console.log("Setting current user with data:", userData);
          setCurrentUser({ ...user, ...userData });
          
          // Set token in cookie
          try {
            const token = await user.getIdToken();
            Cookies.set('token', token, { expires: 7 });
          } catch (tokenError) {
            console.error("Error setting auth token:", tokenError);
          }
        } catch (error) {
          console.error("Error in auth state change handler:", error);
          setCurrentUser(user); // Fall back to just the user object without Firestore data
        }
      } else {
        console.log("Clearing current user state");
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
  
  console.log("Auth context value:", { 
    currentUser: currentUser ? { uid: currentUser.uid, email: currentUser.email } : null,
    loading 
  });

  return (
    <AuthContext.Provider value={value}>
      {(!loading || !isBrowser) && children}
    </AuthContext.Provider>
  );
};