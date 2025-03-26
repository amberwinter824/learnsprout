import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar() {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  
  // Get the user's name from displayName
  const userName = currentUser?.displayName || "User";
  
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* ... existing code ... */}
      
      {/* User profile section at bottom */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <Link href="/dashboard/settings" className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {userName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              Settings
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
} 