// contexts/AuthContext.tsx - Enhanced version
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
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Define user data interface with role support
export interface UserData {
  name?: string;
  email?: string;
  createdAt?: any;
  updatedAt?: any;
  role?: "parent" | "educator" | "admin" | "specialist";
  associatedInstitutions?: string[];
}

// Define permissions
export type Permission = 
  | "manage_children"
  | "view_children" 
  | "manage_activities" 
  | "manage_institutions"
  | "manage_classrooms"
  | "view_observations"
  | "create_observations";

// Define auth context interface with role support
export interface AuthContextType {
  currentUser: (User & UserData) | null;
  signup: (email: string, password: string, name: string, role?: string) => Promise<User>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getUserData: (uid: string) => Promise<UserData | null>;
  updateUserRole: (role: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (requiredRole: string) => boolean;
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
  updateUserRole: async () => { throw new Error('AuthProvider not initialized'); },
  hasPermission: () => false,
  hasRole: () => false,
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

// Custom hook for role-based access control
export const useRoleAccess = (requiredRole: string) => {
  const { currentUser, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        setHasAccess(false);
        return;
      }
      
      const userRole = currentUser.role || 'parent';
      
      // Define role hierarchy (who can access what)
      const roleHierarchy: Record<string, string[]> = {
        "admin": ["admin", "educator", "parent", "specialist"],
        "educator": ["educator", "parent"],
        "specialist": ["specialist", "parent"],
        "parent": ["parent"]
      };
      
      const allowedRoles = roleHierarchy[userRole] || [userRole];
      setHasAccess(allowedRoles.includes(requiredRole));
    }
  }, [currentUser, loading, requiredRole]);
  
  return { hasAccess, loading };
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

  // New function to check if user has a specific permission based on role
  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser || !currentUser.role) return false;

    // Define role-based permissions
    const rolePermissions: Record<string, Permission[]> = {
      "parent": [
        "manage_children", 
        "view_children", 
        "view_observations",
        "create_observations"
      ],
      "educator": [
        "view_children", 
        "manage_activities", 
        "view_observations",
        "create_observations"
      ],
      "admin": [
        "manage_children",
        "view_children", 
        "manage_activities", 
        "manage_institutions",
        "manage_classrooms",
        "view_observations",
        "create_observations"
      ],
      "specialist": [
        "view_children", 
        "view_observations",
        "create_observations"
      ]
    };

    // Check if the current user's role has the requested permission
    const userPermissions = rolePermissions[currentUser.role] || [];
    return userPermissions.includes(permission);
  };
  
  // Function to check if a user can access content for a specific role
  const hasRole = (requiredRole: string): boolean => {
    if (!currentUser || !currentUser.role) return false;
    
    // Define role hierarchy
    const roleHierarchy: Record<string, string[]> = {
      "admin": ["admin", "educator", "parent", "specialist"],
      "educator": ["educator", "parent"],
      "specialist": ["specialist", "parent"],
      "parent": ["parent"]
    };
    
    // Check if the user's role can access the required role's content
    const allowedRoles = roleHierarchy[currentUser.role] || [currentUser.role];
    return allowedRoles.includes(requiredRole);
  };

  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    role: string = "parent"
  ): Promise<User> => {
    if (!email || !password || !name) {
      throw new Error("Email, password, and name are required");
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role, // Store user role
        associatedInstitutions: [], // Initialize empty array for institutions
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      if (isBrowser) {
        const token = await user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
      }
      
      const userData = { name, email, role } as UserData;
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

  // New function to update user role
  const updateUserRole = async (role: string): Promise<void> => {
    if (!currentUser) {
      throw new Error("No user is logged in");
    }
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCurrentUser(prev => {
        if (!prev) return null;
        return { ...prev, role } as (User & UserData);
      });
      
      console.log(`User role updated to ${role}`);
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
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
    updateUserRole,
    hasPermission,
    hasRole,
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