// contexts/AuthContext.tsx - Enhanced version with role switching
"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  UserCredential,
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { 
  createFamily as createFamilyService,
  acceptFamilyInvitation,
  createFamilyInvitation,
  getFamilyMembers as getFamilyMembersService,
  removeFromFamily,
  hasChildAccess as checkChildAccess
} from '../lib/familyService';

// Define user data interface with role support
export interface UserData {
  uid?: string;
  name?: string;
  email?: string;
  createdAt?: any;
  updatedAt?: any;
  role?: "parent" | "educator" | "admin" | "specialist";
  associatedRoles?: string[]; // All roles assigned to this user
  activeRole?: string; // Currently active role
  associatedInstitutions?: string[];
  preferences?: {
    activeRole?: string;
    emailNotifications?: boolean;
    weeklyDigest?: boolean;
    theme?: string;
    activityPreferences?: {
      daysPerWeek?: string[];
      activitiesPerDay?: number;
      scheduleByDay?: {[key: string]: number};
    };
  };
  
  // New family fields
  familyId?: string;         // ID of the family this user belongs to (if any)
  familyRole?: "owner" | "member"; // Role within the family
  familyName?: string;       // Family name (only needed for owner)
  childrenAccess?: string[]; // IDs of children this user can access
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
  updateUserPreferences: (preferences: UserData['preferences']) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (requiredRole: string) => boolean;
  loading: boolean;
  initialized: boolean;
  availableRoles: string[]; // All roles available to the user
  activeRole: string; // Currently active role
  switchRole: (role: string) => Promise<void>; // Function to switch active role
  updateUserProfile: (profileData: { displayName?: string; photoURL?: string }) => Promise<boolean>;
  
  // New family-related methods
  createFamily: (familyName: string) => Promise<string>;
  joinFamily: (inviteCode: string) => Promise<boolean>;
  inviteToFamily: (email: string) => Promise<string>;
  getFamilyMembers: () => Promise<UserData[]>;
  leaveFamily: () => Promise<boolean>;
  hasChildAccess: (childId: string) => Promise<boolean>;
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
  updateUserPreferences: async () => { throw new Error('AuthProvider not initialized'); },
  hasPermission: () => false,
  hasRole: () => false,
  loading: true,
  initialized: false,
  availableRoles: [],
  activeRole: '',
  switchRole: async () => { throw new Error('AuthProvider not initialized'); },
  updateUserProfile: async () => false,
  
  // New family-related methods with default implementations
  createFamily: async () => { throw new Error('AuthProvider not initialized'); },
  joinFamily: async () => { throw new Error('AuthProvider not initialized'); },
  inviteToFamily: async () => { throw new Error('AuthProvider not initialized'); },
  getFamilyMembers: async () => { throw new Error('AuthProvider not initialized'); },
  leaveFamily: async () => { throw new Error('AuthProvider not initialized'); },
  hasChildAccess: async () => { throw new Error('AuthProvider not initialized'); }
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
  const { currentUser, loading, activeRole } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        setHasAccess(false);
        return;
      }
      
      const userRole = activeRole || currentUser.role || 'parent';
      
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
  }, [currentUser, loading, requiredRole, activeRole]);
  
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
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [activeRole, setActiveRole] = useState<string>('');
  const router = useRouter();

  // New function to check if user has a specific permission based on role
  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    
    // Use the active role if available, otherwise fall back to the user's default role
    const userRole = activeRole || currentUser.role;
    if (!userRole) return false;

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
    const userPermissions = rolePermissions[userRole] || [];
    return userPermissions.includes(permission);
  };
  
  // Function to check if a user can access content for a specific role
  const hasRole = (requiredRole: string): boolean => {
    if (!currentUser) return false;
    
    // Use the active role if available, otherwise fall back to the user's default role
    const userRole = activeRole || currentUser.role;
    if (!userRole) return false;
    
    // Define role hierarchy
    const roleHierarchy: Record<string, string[]> = {
      "admin": ["admin", "educator", "parent", "specialist"],
      "educator": ["educator", "parent"],
      "specialist": ["specialist", "parent"],
      "parent": ["parent"]
    };
    
    // Check if the user's role can access the required role's content
    const allowedRoles = roleHierarchy[userRole] || [userRole];
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
      
      // Initialize with the first role as both the role and in the associatedRoles array
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role, // Default role
        associatedRoles: [role], // Array of all roles assigned to this user
        activeRole: role, // Currently active role
        associatedInstitutions: [], // Initialize empty array for institutions
        preferences: {
          activeRole: role,
          emailNotifications: true,
          weeklyDigest: true,
          theme: 'light'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      if (isBrowser) {
        const token = await user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
        
        // Store active role in a cookie for middleware access
        Cookies.set('role', role, { expires: 7 });
      }
      
      const userData = { 
        name, 
        email, 
        role,
        associatedRoles: [role],
        activeRole: role,
        preferences: {
          activeRole: role
        }
      } as UserData;
      
      setCurrentUser({ ...user, ...userData } as (User & UserData));
      setAvailableRoles([role]);
      setActiveRole(role);
      
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
      
      // Set active role
      let userActiveRole = userData?.activeRole || userData?.preferences?.activeRole || userData?.role || 'parent';
      
      // Get all roles user has
      const userRoles = userData?.associatedRoles || [userData?.role || 'parent'];
      
      // Make sure the active role is in the list of available roles
      if (!userRoles.includes(userActiveRole)) {
        userActiveRole = userRoles[0];
      }
      
      setCurrentUser({ 
        ...userCredential.user, 
        ...userData,
        activeRole: userActiveRole
      } as (User & UserData));
      
      setAvailableRoles(userRoles);
      setActiveRole(userActiveRole);
      
      if (isBrowser) {
        const token = await userCredential.user.getIdToken();
        Cookies.set('token', token, { expires: 7 });
        
        // Store active role in a cookie for middleware access
        Cookies.set('role', userActiveRole, { expires: 7 });
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
        Cookies.remove('role');
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
      setAvailableRoles([]);
      setActiveRole('');
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
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }
      
      const userData = userDoc.data() as UserData;
      
      // Get current roles or initialize
      const currentRoles = userData.associatedRoles || [userData.role || 'parent'];
      
      // Add the new role if it doesn't exist
      let updatedRoles = currentRoles;
      if (!currentRoles.includes(role)) {
        updatedRoles = [...currentRoles, role];
      }
      
      // Update Firestore
      await updateDoc(userRef, {
        role, // Primary role
        associatedRoles: updatedRoles, // All roles
        'preferences.activeRole': role, // Set active role in preferences
        activeRole: role, // Set active role directly
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCurrentUser(prev => {
        if (!prev) return null;
        return { 
          ...prev, 
          role,
          associatedRoles: updatedRoles,
          activeRole: role,
          preferences: {
            ...prev.preferences,
            activeRole: role
          }
        } as (User & UserData);
      });
      
      setAvailableRoles(updatedRoles);
      setActiveRole(role);
      
      // Update role cookie for middleware
      if (isBrowser) {
        Cookies.set('role', role, { expires: 7 });
      }
      
      console.log(`User role updated to ${role}`);
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  };
  
  // Function to switch between available roles
  const switchRole = async (role: string): Promise<void> => {
    if (!currentUser) {
      throw new Error("No user is logged in");
    }
    
    if (!availableRoles.includes(role)) {
      throw new Error(`Role ${role} is not available for this user`);
    }
    
    try {
      // Update user preferences in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        activeRole: role,
        'preferences.activeRole': role,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setActiveRole(role);
      setCurrentUser(prev => {
        if (!prev) return null;
        return { 
          ...prev, 
          activeRole: role,
          preferences: {
            ...prev.preferences,
            activeRole: role
          }
        } as (User & UserData);
      });
      
      // Update role cookie for middleware
      if (isBrowser) {
        Cookies.set('role', role, { expires: 7 });
      }
      
      console.log(`Switched to role: ${role}`);
      
      // Redirect based on the new role
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'educator') {
        router.push('/educator/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Error switching role:", error);
      throw error;
    }
  };

  const updateUserPreferences = async (preferences: UserData['preferences']): Promise<void> => {
    if (!currentUser) {
      throw new Error("No user is logged in");
    }
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      // Update Firestore with the new preferences
      await updateDoc(userRef, {
        'preferences': preferences,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCurrentUser(prev => {
        if (!prev) return null;
        return { 
          ...prev, 
          preferences
        } as (User & UserData);
      });
      
      console.log(`User preferences updated successfully`);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw error;
    }
  };

  const updateUserProfile = async (profileData: { displayName?: string; photoURL?: string }) => {
    if (!auth.currentUser) {
      console.warn('No authenticated user found when trying to update profile');
      return false;
    }
    
    try {
      await updateProfile(auth.currentUser, profileData);
      
      // Update the currentUser state to reflect changes
      setCurrentUser(prevUser => {
        if (!prevUser) return prevUser;
        return {
          ...prevUser,
          displayName: profileData.displayName || prevUser.displayName,
          photoURL: profileData.photoURL || prevUser.photoURL
        };
      });
      
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  const createFamily = async (familyName: string): Promise<string> => {
    if (!currentUser) {
      throw new Error("No user is logged in");
    }
    
    try {
      const familyId = await createFamilyService(currentUser.uid, familyName);
      
      // Update current user in state
      setCurrentUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          familyId,
          familyRole: 'owner',
          familyName
        } as (User & UserData);
      });
      
      return familyId;
    } catch (error) {
      console.error("Error creating family:", error);
      throw error;
    }
  };

  const joinFamily = async (inviteCode: string): Promise<boolean> => {
    if (!currentUser) {
      throw new Error("No user is logged in");
    }
    
    try {
      const success = await acceptFamilyInvitation(currentUser.uid, inviteCode);
      
      // If successful, update user data
      if (success) {
        // Refresh user data
        const userData = await getUserData(currentUser.uid);
        
        setCurrentUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ...userData
          } as (User & UserData);
        });
      }
      
      return success;
    } catch (error) {
      console.error("Error joining family:", error);
      throw error;
    }
  };

  const inviteToFamily = async (email: string): Promise<string> => {
    if (!currentUser) {
      throw new Error("No user is logged in");
    }
    
    if (!currentUser.familyId) {
      throw new Error("You are not part of a family");
    }
    
    try {
      const inviteCode = await createFamilyInvitation(
        currentUser.uid,
        currentUser.familyId,
        email
      );
      
      return inviteCode;
    } catch (error) {
      console.error("Error creating invitation:", error);
      throw error;
    }
  };

  const getFamilyMembers = async (): Promise<UserData[]> => {
    if (!currentUser || !currentUser.familyId) {
      return [];
    }
    
    try {
      return await getFamilyMembersService(currentUser.familyId);
    } catch (error) {
      console.error("Error getting family members:", error);
      return [];
    }
  };

  const leaveFamily = async (): Promise<boolean> => {
    if (!currentUser || !currentUser.familyId) {
      throw new Error("Not part of a family");
    }
    
    try {
      const isOwner = currentUser.familyRole === 'owner';
      const success = await removeFromFamily(
        currentUser.familyId,
        currentUser.uid,
        isOwner
      );
      
      if (success) {
        // Update local state
        setCurrentUser(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          delete updated.familyId;
          delete updated.familyRole;
          delete updated.familyName;
          return updated as (User & UserData);
        });
      }
      
      return success;
    } catch (error) {
      console.error("Error leaving family:", error);
      throw error;
    }
  };

  // Function to check if the current user has access to a specific child
  const hasChildAccess = async (childId: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      return await checkChildAccess(currentUser.uid, childId);
    } catch (error) {
      console.error("Error checking child access:", error);
      return false;
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
      
      try {
        if (user) {
          try {
            const userData = await getUserData(user.uid);
            
            // Determine active role
            const userActiveRole = userData?.activeRole || userData?.preferences?.activeRole || userData?.role || 'parent';
            
            // Get all roles user has
            const userRoles = userData?.associatedRoles || [userData?.role || 'parent'];
            
            setAvailableRoles(userRoles);
            setActiveRole(userActiveRole);
            
            setCurrentUser({ 
              ...user, 
              ...userData,
              activeRole: userActiveRole
            } as (User & UserData));
            
            try {
              const token = await user.getIdToken();
              Cookies.set('token', token, { expires: 7 });
              
              // Store active role in a cookie for middleware access
              Cookies.set('role', userActiveRole, { expires: 7 });
            } catch (tokenError) {
              console.error("Error setting auth token:", tokenError);
            }
          } catch (error) {
            console.error("Error in auth state change handler:", error);
            // Still set the user even if we couldn't get additional data
            setCurrentUser(user as (User & UserData));
          }
        } else {
          setCurrentUser(null);
          setAvailableRoles([]);
          setActiveRole('');
          Cookies.remove('token');
          Cookies.remove('role');
        }
      } catch (mainError) {
        console.error("Critical error in auth state change:", mainError);
        // Ensure we still set loading to false even if there's an error
        setCurrentUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [isBrowser, router]);

  useEffect(() => {
    if (currentUser) {
      console.log("AuthContext: User is authenticated", currentUser.uid);
    } else {
      console.log("AuthContext: No authenticated user");
    }
  }, [currentUser]);

  const value: AuthContextType = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    getUserData,
    updateUserRole,
    updateUserPreferences,
    hasPermission,
    hasRole,
    loading,
    initialized,
    availableRoles,
    activeRole,
    switchRole,
    updateUserProfile,
    
    // New family-related methods
    createFamily,
    joinFamily,
    inviteToFamily,
    getFamilyMembers,
    leaveFamily,
    hasChildAccess
  };

  console.log("AuthProvider rendering with loading:", loading, "activeRole:", activeRole);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};