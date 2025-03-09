// app/(admin)/layout.tsx
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
  Home
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { currentUser } = useAuth();
  
  const isActive = (path: string) => {
    return pathname?.startsWith(path) 
      ? 'bg-blue-700 text-white' 
      : 'text-blue-100 hover:bg-blue-600 hover:text-white';
  };
  
  return (
    <RoleProtectedRoute requiredRole="admin">
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <div className="w-64 bg-blue-800 text-white flex flex-col">
          {/* Admin navigation items */}
          <div className="p-4 bg-blue-900">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-8 w-8 text-blue-300" />
              <span className="text-xl font-bold">Learn Sprout</span>
            </div>
            <div className="mt-1 text-xs text-blue-300">Admin Portal</div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 pt-4">
            <ul className="space-y-1">
              <li>
                <Link 
                  href="/admin/dashboard" 
                  className={`flex items-center px-4 py-3 ${isActive('/admin/dashboard')}`}
                >
                  <Home className="h-5 w-5 mr-3" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/users" 
                  className={`flex items-center px-4 py-3 ${isActive('/admin/users')}`}
                >
                  <Users className="h-5 w-5 mr-3" />
                  User Management
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/institutions" 
                  className={`flex items-center px-4 py-3 ${isActive('/admin/institutions')}`}
                >
                  <School className="h-5 w-5 mr-3" />
                  Institutions
                </Link>
              </li>
              <li>
                <Link 
                  href="/admin/analytics" 
                  className={`flex items-center px-4 py-3 ${isActive('/admin/analytics')}`}
                >
                  <BarChart className="h-5 w-5 mr-3" />
                  Analytics
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        {/* Main content */}
        <div className="flex-1 bg-gray-100 min-h-screen">
          {children}
        </div>
      </div>
    </RoleProtectedRoute>
  );
}