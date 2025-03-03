"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  UserCredential,
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

// Define user data interface
export interface UserData {
  name?: string;
  email?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Define auth context interface
export interface AuthContextType {
  currentUser: (User & UserData) | null;
  signup: (email: string, password: string, name: string) => Promise<User>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getUserData: (uid: string) => Promise<UserData | null>;
  loading: boolean;
  initialized: boolean;
}

// Create a default context value with no-op functions
const defaultContext: AuthContextType = {
  currentUser: null,
  signup: async () => { throw new Error('AuthProvider not initialized'); },
  login: async () => { throw new Error('AuthProvider not initialized'); },
  logout: async () => { throw new Error('AuthProvider not initialized'); },
  resetPassword: async () => { throw new Error('AuthProvider not initialized'); },
  getUserData: async () => null,
  loading: true,
  initialized: false
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // Add better error handling for when context is not available
  if (!context || context === defaultContext) {
    console.error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  console.log("AuthProvider initializing");
  const isBrowser = typeof window !== 'undefined';
  const [currentUser, setCurrentUser] = useState<(User & UserData) | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  const signup = async (email: string, password: string, name: string): Promise<User> => {
    if (!email || !password || !name) {
      throw new Error("Email, password, and name are required");
    }
    
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
      setCurrentUser({ ...user, ...userData } as (User & UserData));
      
      return user;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    if (!email || !password) {
      console.error("Email or password is missing");
      throw new Error("Email and password are required");
    }
    
    try {
      console.log(`Attempting login for ${email}`);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful, fetching user data");
      
      const userData = await getUserData(userCredential.user.uid);
      setCurrentUser({ ...userCredential.user, ...userData } as (User & UserData));
      
      if (isBrowser) {
        const token = await userCredential.user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
      }
      
      return userCredential;
    } catch (error) {
      console.error("Login error in AuthContext:", error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log("Logging out...");
      await signOut(auth);
      
      if (isBrowser) {
        Cookies.remove('token');
        // Clear redirect flags
        const keys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('redirect_attempted_')) {
            keys.push(key);
          }
        }
        keys.forEach(key => sessionStorage.removeItem(key));
      }
      
      setCurrentUser(null);
      console.log("Logged out, redirecting to login");
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const resetPassword = (email: string): Promise<void> => {
    return sendPasswordResetEmail(auth, email);
  };

  const getUserData = async (uid: string): Promise<UserData | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? userDoc.data() as UserData : null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  };

  useEffect(() => {
    console.log("AuthProvider useEffect running");
    
    if (!isBrowser) {
      setLoading(false);
      setInitialized(true);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? `User ${user.uid} logged in` : "No user");
      
      if (user) {
        try {
          const userData = await getUserData(user.uid);
          setCurrentUser({ ...user, ...userData } as (User & UserData));
          
          try {
            const token = await user.getIdToken();
            Cookies.set('token', token, { expires: 7 });
          } catch (tokenError) {
            console.error("Error setting auth token:", tokenError);
          }
        } catch (error) {
          console.error("Error in auth state change handler:", error);
          setCurrentUser(user as (User & UserData));
        }
      } else {
        setCurrentUser(null);
        Cookies.remove('token');
      }
      
      setLoading(false);
      setInitialized(true);
    });

    return () => unsubscribe();
  }, [isBrowser]);

  const value: AuthContextType = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    getUserData,
    loading,
    initialized
  };

  console.log("AuthProvider rendering with loading:", loading);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};