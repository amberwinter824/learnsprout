import { User, UserCredential } from 'firebase/auth';

interface UserData {
  name?: string;
  email?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AuthContextType {
  currentUser: (User & UserData) | null;
  signup: (email: string, password: string, name: string) => Promise<User>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getUserData: (uid: string) => Promise<UserData | null>;
  loading: boolean;
}

export function useAuth(): AuthContextType;