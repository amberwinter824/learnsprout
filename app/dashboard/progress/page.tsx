"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Award, 
  BarChart2,
  Book,
  Loader2,
  Calendar,
  ArrowUpRight,
  Filter,
  ChevronRight,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import ProgressCelebration from '@/components/parent/ProgressCelebration';

// Define interfaces
interface Child {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  interests?: string[];
  active?: boolean;
}

interface ProgressRecord {
  id: string;
  childId: string;
  activityId: string;
  activityTitle?: string;
  completionStatus: string;
  date: Timestamp;
  engagementLevel?: string;
  notes?: string;
  skillsDemonstrated?: string[];
}

interface ChildSkill {
  id: string;
  childId: string;
  skillId: string;
  skillName?: string;
  status: 'not_started' | 'emerging' | 'developing' | 'mastered';
  lastAssessed?: Timestamp;
}

interface ProgressSummary {
  childId: string;
  childName: string;
  totalActivities: number;
  completedActivities: number;
  recentActivities: number;
  totalSkills: number;
  inProgressSkills: number;
  masteredSkills: number;
  lastActivity?: Timestamp;
}

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="bg-red-50 p-4 rounded-lg text-red-800 max-w-3xl mx-auto">
      <div className="flex">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-medium">Error loading progress data</h3>
          <p className="mt-1">{error.message}</p>
          <button
            onClick={resetErrorBoundary}
            className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgressRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to development page
    router.replace('/dashboard/development');
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
      <p className="text-gray-500">Redirecting to Development page...</p>
    </div>
  );
}