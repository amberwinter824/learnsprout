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
  Package,
  Building2,
  BookOpen,
  BarChart2,
  Shield
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
        <div className="w-64 bg-blue-900 text-white">
          <div className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6" />
              <h1 className="text-xl font-semibold">Learn Sprout</h1>
            </div>
            <p className="text-sm text-blue-200 mt-1">Admin Portal</p>
          </div>
          <nav className="mt-4">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin/dashboard"
                  className={`flex items-center px-4 py-2.5 text-sm font-medium ${
                    pathname === '/admin/dashboard' || pathname === '/admin'
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className={`flex items-center px-4 py-2.5 text-sm font-medium ${
                    pathname.startsWith('/admin/users')
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <Users className="h-5 w-5 mr-3" />
                  User Management
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/institutions"
                  className={`flex items-center px-4 py-2.5 text-sm font-medium ${
                    pathname.startsWith('/admin/institutions')
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <Building2 className="h-5 w-5 mr-3" />
                  Institutions
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/materials"
                  className={`flex items-center px-4 py-2.5 text-sm font-medium ${
                    pathname.startsWith('/admin/materials')
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <Package className="h-5 w-5 mr-3" />
                  Materials
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/activities"
                  className={`flex items-center px-4 py-2.5 text-sm font-medium ${
                    pathname.startsWith('/admin/activities')
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <BookOpen className="h-5 w-5 mr-3" />
                  Activities
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/analytics"
                  className={`flex items-center px-4 py-2.5 text-sm font-medium ${
                    pathname.startsWith('/admin/analytics')
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <BarChart2 className="h-5 w-5 mr-3" />
                  Analytics
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className={`flex items-center px-4 py-2.5 text-sm font-medium ${
                    pathname.startsWith('/admin/settings')
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  <Settings className="h-5 w-5 mr-3" />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 bg-white border-b">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Logged in as: {currentUser?.email}
              </div>
              <button
                onClick={logout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </RoleProtectedRoute>
  );
}