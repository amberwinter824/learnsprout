"use client"
import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { Sprout, Home, Users, BookOpen, BarChart2, LogOut, Menu, X, Settings, Package, Award } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Cookies from 'js-cookie';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

interface CombinedUser extends User {
  name?: string;
  displayName: string | null;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [currentUser, setCurrentUser] = useState<CombinedUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};

          // Combine Firebase user with Firestore user data
          const combinedUser = { ...user, ...userData } as CombinedUser;
          setCurrentUser(combinedUser);

          // Set token in cookies
          const token = await user.getIdToken();
          Cookies.set('token', token, { expires: 7 });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser(user as CombinedUser);
        }
      } else {
        setCurrentUser(null);
        Cookies.remove('token');
      }
    });

    return () => unsubscribe();
  }, []);

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Children', href: '/dashboard/children', icon: Users },
    { name: 'Activities', href: '/dashboard/activities', icon: BookOpen },
    { name: 'Development', href: '/dashboard/development', icon: Award },
    { name: 'Materials', href: '/dashboard/materials', icon: Package },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = async (): Promise<void> => {
    try {
      console.log("Logging out...");
      await signOut(auth);
      
      // Remove token and clear session storage
      Cookies.remove('token');
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('redirect_attempted_')) {
          keys.push(key);
        }
      }
      keys.forEach(key => sessionStorage.removeItem(key));

      console.log("Logged out, redirecting to login");
      router.push('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile menu */}
        <div className="lg:hidden">
          <div className="fixed top-0 left-0 w-full bg-white z-10 border-b">
            <div className="px-4 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Sprout className="h-8 w-8 text-emerald-500" />
                <span className="ml-2 text-xl font-semibold text-gray-900">Learn Sprout</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-600 focus:outline-none"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
            
            {isMobileMenuOpen && (
              <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                        group flex items-center px-3 py-2 text-base font-medium rounded-md
                      `}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon
                        className={`
                          ${isActive ? 'text-emerald-500' : 'text-gray-500 group-hover:text-gray-500'}
                          mr-3 flex-shrink-0 h-6 w-6
                        `}
                      />
                      {item.name}
                    </Link>
                  );
                })}
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-3 py-2 text-base font-medium rounded-md"
                >
                  <LogOut className="mr-3 flex-shrink-0 h-6 w-6 text-gray-500 group-hover:text-gray-500" />
                  Logout
                </button>
              </div>
            )}
          </div>
          <div className="h-16"></div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-grow bg-white pt-5 overflow-y-auto border-r">
            <div className="flex items-center flex-shrink-0 px-4">
              <Sprout className="h-8 w-8 text-emerald-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">Learn Sprout</span>
            </div>
            <div className="mt-6 flex-1 flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                        group flex items-center px-3 py-2 text-sm font-medium rounded-md
                      `}
                    >
                      <item.icon
                        className={`
                          ${isActive ? 'text-emerald-500' : 'text-gray-500 group-hover:text-gray-500'}
                          mr-3 flex-shrink-0 h-6 w-6
                        `}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-gray-200 pt-4 pb-3 px-2">
                {currentUser && (
                  <div className="flex items-center px-3 mb-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                        {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 
                         currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {currentUser.displayName || currentUser.name || 'User'}
                      </div>
                      <div className="text-xs text-gray-500">{currentUser.email}</div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-3 py-2 text-sm font-medium rounded-md"
                >
                  <LogOut className="mr-3 flex-shrink-0 h-6 w-6 text-gray-500 group-hover:text-gray-500" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="lg:pl-64">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}