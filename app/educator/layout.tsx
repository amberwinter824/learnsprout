// app/(educator)/layout.tsx
'use client';

import { ReactNode } from 'react';
import RoleProtectedRoute from '@/app/components/RoleProtectedRoute';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  School, 
  Users, 
  BookOpen, 
  ClipboardList, 
  Settings, 
  MessageSquare,
  Home,
  LogOut,
  Loader2
} from 'lucide-react';

interface EducatorLayoutProps {
  children: ReactNode;
}

export default function EducatorLayout({ children }: EducatorLayoutProps) {
  const pathname = usePathname();
  const { currentUser, logout, loading } = useAuth();
  
  const isActive = (path: string) => {
    return pathname?.startsWith(path) 
      ? 'bg-emerald-700 text-white' 
      : 'text-emerald-100 hover:bg-emerald-600 hover:text-white';
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      // Redirect happens in the logout function
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  return (
    <RoleProtectedRoute requiredRole={["educator", "admin"]}>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <div className="w-64 bg-emerald-800 text-white flex flex-col">
          {/* Logo */}
          <div className="p-4 bg-emerald-900">
            <div className="flex items-center space-x-2">
              <School className="h-8 w-8 text-emerald-300" />
              <span className="text-xl font-bold">Learn Sprout</span>
            </div>
            <div className="mt-1 text-xs text-emerald-300">Educator Portal</div>
          </div>
          
          {/* User info */}
          <div className="p-4 border-b border-emerald-700">
            <div className="text-sm font-medium">{currentUser?.name || currentUser?.email}</div>
            <div className="text-xs text-emerald-300 capitalize">{currentUser?.role || 'Educator'}</div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 pt-4">
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/educator/dashboard" 
                  className={`flex items-center px-4 py-3 ${isActive('/educator/dashboard')}`}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/educator/classrooms" 
                  className={`flex items-center px-4 py-3 ${isActive('/educator/classrooms')}`}
                >
                  <School className="h-5 w-5 mr-3" />
                  My Classrooms
                </Link>
              </li>
              <li>
                <Link 
                  href="/educator/students" 
                  className={`flex items-center px-4 py-3 ${isActive('/educator/students')}`}
                >
                  <Users className="h-5 w-5 mr-3" />
                  Students
                </Link>
              </li>
              <li>
                <Link 
                  href="/educator/activities" 
                  className={`flex items-center px-4 py-3 ${isActive('/educator/activities')}`}
                >
                  <BookOpen className="h-5 w-5 mr-3" />
                  Activities
                </Link>
              </li>
              <li>
                <Link 
                  href="/educator/observations" 
                  className={`flex items-center px-4 py-3 ${isActive('/educator/observations')}`}
                >
                  <ClipboardList className="h-5 w-5 mr-3" />
                  Observations
                </Link>
              </li>
              <li>
                <Link 
                  href="/educator/messages" 
                  className={`flex items-center px-4 py-3 ${isActive('/educator/messages')}`}
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Messages
                </Link>
              </li>
            </ul>
          </nav>
          
          {/* Bottom actions */}
          <div className="p-4 border-t border-emerald-700">
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/educator/settings" 
                  className={`flex items-center px-4 py-3 ${isActive('/educator/settings')}`}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Settings
                </Link>
              </li>
              <li>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-emerald-100 hover:bg-emerald-600 hover:text-white"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 bg-gray-100 min-h-screen">
          {children}
        </div>
      </div>
    </RoleProtectedRoute>
  );
}