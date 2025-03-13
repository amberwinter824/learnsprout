// app/components/parent/ChildCard.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { User, MoreVertical, PenSquare, Calendar, Clock, ChevronRight } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  ageGroup?: string;
  birthdate?: string;
  interests?: string[];
  [key: string]: any;
}

interface ChildCardProps {
  child: Child;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ChildCard({
  child,
  isSelected,
  onSelect,
}: ChildCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <div 
      className={`rounded-lg border p-3 cursor-pointer relative ${
        isSelected 
          ? 'border-emerald-300 bg-emerald-50' 
          : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700'
          }`}>
            {child.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <h3 className="font-medium text-gray-900">{child.name}</h3>
            {child.ageGroup && (
              <p className="text-xs text-gray-500">{child.ageGroup}</p>
            )}
          </div>
        </div>
        
        <button
          onClick={toggleMenu}
          className="p-1 rounded-full hover:bg-gray-100 focus:outline-none relative z-10"
          aria-label="Options"
        >
          <MoreVertical className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      
      {/* Quick actions - always visible */}
      <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-xs">
        <Link
          href={`/dashboard/children/${child.id}`}
          className="text-gray-600 hover:text-gray-800 flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          Details
          <ChevronRight className="h-3 w-3 ml-1" />
        </Link>
      </div>
      
      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute right-0 top-9 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <Link
              href={`/dashboard/children/${child.id}`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
              onClick={(e) => e.stopPropagation()}
            >
              <User className="h-4 w-4 mr-2 text-gray-500" />
              View Profile
            </Link>
            
            <Link
              href={`/dashboard/children/${child.id}/weekly-plan`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              Weekly Plan
            </Link>
            
            <Link
              href={`/dashboard/children/${child.id}/progress`}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
              onClick={(e) => e.stopPropagation()}
            >
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              Progress
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}