'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingWizard from '@/components/OnboardingWizard';

export default function OnboardingPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user has completed onboarding, redirect to dashboard
    if (currentUser) {
      const hasChildren = currentUser.childrenAccess && currentUser.childrenAccess.length > 0;
      const hasSchedule = currentUser.preferences?.activityPreferences?.scheduleByDay;
      const isOnboardingCompleted = currentUser.onboardingCompleted;
      
      // Redirect if onboarding is marked as completed OR if they have both children and schedule preferences
      if (isOnboardingCompleted || (hasChildren && hasSchedule)) {
        router.push('/dashboard');
      }
    }
  }, [currentUser, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingWizard />
    </div>
  );
} 