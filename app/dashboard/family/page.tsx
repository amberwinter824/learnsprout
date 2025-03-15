// app/dashboard/family/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  ArrowLeft, 
  AlertCircle, 
  Loader2
} from 'lucide-react';
import FamilyManagement from '@/app/components/FamilyManagement';

export default function FamilySettingsPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  
  // Redirect to dashboard if not logged in
  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/settings" className="inline-flex items-center text-emerald-500 hover:text-emerald-600">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Family Settings</h1>
        <p className="text-gray-600">Manage your family members and access</p>
      </div>
      
      <div className="space-y-6">
        <FamilyManagement />
        
        {/* Help Information */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-md font-medium text-blue-800 mb-2 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-blue-500" />
            About Family Sharing
          </h3>
          <div className="text-sm text-blue-700">
            <p className="mb-2">
              <strong>What is a family?</strong> A family group allows multiple caregivers to access the same children's profiles, 
              activities, and progress tracking.
            </p>
            <p className="mb-2">
              <strong>Who should be in your family?</strong> Include parents, grandparents, nannies, or other caregivers 
              who need access to your children's information.
            </p>
            <p>
              <strong>How does it work?</strong> The primary account can invite members to the family. 
              Once joined, they will have access to all children in the family.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}