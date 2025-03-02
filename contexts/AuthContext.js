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
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  const signup = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      if (isBrowser) {
        const token = await user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
      }
      
      const userData = { name, email };
      setCurrentUser({ ...user, ...userData });
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await getUserData(userCredential.user.uid);
      
      setCurrentUser({ ...userCredential.user, ...userData });
      
      if (isBrowser) {
        const token = await userCredential.user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
      }
      
      return userCredential;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      
      if (isBrowser) {
        Cookies.remove('token');
        // Clear redirect flags
        const keys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('redirect_attempted_')) {
            keys.push(key);
          }
        }
        keys.forEach(key => sessionStorage.removeItem(key));
      }
      
      setCurrentUser(null);
      router.push('/login');
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const getUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? userDoc.data() : null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!isBrowser) {
      setLoading(false);
      setInitialized(true);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userData = await getUserData(user.uid);
          setCurrentUser({ ...user, ...userData });
          
          try {
            const token = await user.getIdToken();
            Cookies.set('token', token, { expires: 7 });
          } catch (tokenError) {
            console.error("Error setting auth token:", tokenError);
          }
        } catch (error) {
          console.error("Error in auth state change handler:", error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
        Cookies.remove('token');
      }
      
      setLoading(false);
      setInitialized(true);
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
    loading,
    initialized
  };

  return (
    <AuthContext.Provider value={value}>
      {(!loading || !isBrowser) && children}
    </AuthContext.Provider>
  );
};