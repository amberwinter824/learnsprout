// app/admin/layout.tsx
'use client';

import { ReactNode } from 'react';
import RoleProtectedRoute from '@/app/components/RoleProtectedRoute';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  School, 
  Settings, 
  BarChart, 
  ShieldCheck,
  Home,
  LogOut,
  Package
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();
  
  const isActive = (path: string) => {
    return pathname?.startsWith(path) 
      ? 'bg-blue-600 text-white' 
      : 'text-white hover:bg-blue-500 hover:text-white';
  };
  
  return (
    <RoleProtectedRoute requiredRole="admin">
      <div className="min-h-screen flex bg-gray-100">
        {/* Sidebar */}
        <div className="w-64 bg-blue-900 text-white flex flex-col">
          {/* Admin navigation items */}
          <div className="p-4 bg-blue-800">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-8 w-8 text-white" />
              <span className="text-xl font-bold text-white">Learn Sprout</span>
            </div>
            <div className="mt-1 text-sm text-blue-200">Admin Portal</div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 pt-4">
            <ul className="space-y-1 px-2">
              <li>
                <Link 
                  href="/admin/dashboard" 
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/dashboard')}`}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/users" 
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/users')}`}
                >
                  <Users className="h-5 w-5 mr-3" />
                  User Management
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/institutions" 
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/institutions')}`}
                >
                  <School className="h-5 w-5 mr-3" />
                  Institutions
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/materials" 
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/materials')}`}
                >
                  <Package className="h-5 w-5 mr-3" />
                  Materials
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/analytics" 
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/analytics')}`}
                >
                  <BarChart className="h-5 w-5 mr-3" />
                  Analytics
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/settings" 
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/settings')}`}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>

          {/* User info and logout */}
          <div className="p-4 bg-blue-800 mt-auto">
            <div className="text-sm text-blue-100 mb-2">{currentUser?.email}</div>
            <button
              onClick={() => logout()}
              className="flex items-center text-blue-200 hover:text-white transition-colors w-full"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 bg-white border-b">
            <div className="max-w-7xl mx-auto">
              <div className="text-sm text-gray-600">
                Logged in as: {currentUser?.email}
              </div>
            </div>
          </div>
          {children}
        </div>
      </div>
    </RoleProtectedRoute>
  );
}