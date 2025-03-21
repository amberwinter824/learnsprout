'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import OnboardingWizard from '@/components/OnboardingWizard';

export default function OnboardingPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user has completed onboarding (has children and schedule preferences), redirect to dashboard
    if (currentUser) {
      const hasChildren = currentUser.childrenAccess && currentUser.childrenAccess.length > 0;
      const hasSchedule = currentUser.preferences?.activityPreferences?.scheduleByDay;
      
      if (hasChildren && hasSchedule) {
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