'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShoppingBag, Package, ArrowRight, X, Info } from 'lucide-react';
import { getSuggestedUpgradeMaterials, userHasMontessoriKit } from '@/lib/materialsData';

export default function ProgressiveOnboarding() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);
  const [activitiesWithObservations, setActivitiesWithObservations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasDismissed, setHasDismissed] = useState(false);
  const [hasMontessoriKit, setHasMontessoriKit] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  
  useEffect(() => {
    const checkOnboardingProgress = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Check if user has dismissed this notification before
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data().kitPromptDismissed) {
          setHasDismissed(true);
          return;
        }
        
        // Check if they already have a Montessori kit
        const hasKit = await userHasMontessoriKit(currentUser.uid);
        setHasMontessoriKit(hasKit);
        
        if (hasKit) {
          return; // No need to show prompt if they already have a kit
        }
        
        // Get user's children
        const childrenQuery = query(
          collection(db, 'children'),
          where('userId', '==', currentUser.uid),
          limit(1) // Just need one child for now
        );
        
        const childrenSnapshot = await getDocs(childrenQuery);
        
        if (childrenSnapshot.empty) {
          return; // No children yet
        }
        
        const firstChildId = childrenSnapshot.docs[0].id;
        setChildId(firstChildId);
        
        // Count activities with observations
        const progressQuery = query(
          collection(db, 'progressRecords'),
          where('childId', '==', firstChildId)
        );
        
        const progressSnapshot = await getDocs(progressQuery);
        const activitiesWithObsCount = progressSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.observations && data.observations.length > 0;
        }).length;
        
        setActivitiesWithObservations(activitiesWithObsCount);
        
        // Show Montessori kit prompt after 5+ activities with observations
        setShowPrompt(activitiesWithObsCount >= 5);
        
      } catch (error) {
        console.error('Error checking onboarding progress:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkOnboardingProgress();
  }, [currentUser, childId]);
  
  const handleDismiss = async () => {
    if (!currentUser) return;
    
    try {
      // Mark this prompt as dismissed
      await updateDoc(doc(db, 'users', currentUser.uid), {
        kitPromptDismissed: true,
        updatedAt: new Date()
      });
      
      setHasDismissed(true);
    } catch (error) {
      console.error('Error dismissing kit prompt:', error);
    }
  };
  
  // Don't show if loading, prompt dismissed, or conditions not met
  if (loading || hasDismissed || !showPrompt || hasMontessoriKit) {
    return null;
  }
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 relative">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>
      
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-1">
          <Package className="h-6 w-6 text-blue-600" />
        </div>
        
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-medium text-blue-800">
            Take your Montessori journey to the next level
          </h3>
          
          <p className="mt-2 text-sm text-blue-700">
            Great job documenting {activitiesWithObservations} {activitiesWithObservations === 1 ? 'activity' : 'activities'}! 
            You've been using household items to introduce Montessori principles, and now might be a good time 
            to consider a few essential Montessori materials to enhance your child's learning experience.
          </p>
          
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard/materials/starter-kit"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              View Starter Kit
            </Link>
            
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
            >
              Maybe Later
            </button>
          </div>
          
          <div className="mt-3 flex items-start text-xs text-blue-600">
            <Info className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
            <span>
              You can always find materials under the "Materials" section in your dashboard.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 