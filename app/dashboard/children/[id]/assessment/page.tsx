'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import DevelopmentAssessment from '@/app/components/DevelopmentAssessment';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, collection, getDocs, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface AssessmentResult {
  skillId: string;
  status: 'emerging' | 'developing' | 'mastered';
  notes?: string;
}

interface ChildData {
  id: string;
  name: string;
  birthDate: Timestamp | Date | string;
  parentInput?: {
    concerns: string[];
    goals: string[];
    notes: string;
  };
}

export default function ChildAssessmentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childData, setChildData] = useState<ChildData | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    const fetchChildData = async () => {
      try {
        const childDoc = await getDoc(doc(db, 'children', params.id));
        if (!childDoc.exists()) {
          setError('Child not found');
          return;
        }

        const data = childDoc.data();
        setChildData({
          id: childDoc.id,
          name: data.name,
          birthDate: data.birthDate,
          parentInput: data.parentInput
        } as ChildData);
      } catch (err) {
        console.error('Error fetching child data:', err);
        setError('Failed to load child data');
      } finally {
        setLoading(false);
      }
    };

    fetchChildData();
  }, [currentUser, params.id, router]);

  const getBirthDate = (date: Timestamp | Date | string): Date => {
    if (date instanceof Timestamp) {
      return date.toDate();
    }
    if (date instanceof Date) {
      return date;
    }
    return new Date(date);
  };

  const handleAssessmentComplete = async (results: AssessmentResult[]) => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      // Save each skill assessment
      for (const result of results) {
        const skillQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', params.id),
          where('skillId', '==', result.skillId)
        );
        
        const skillSnapshot = await getDocs(skillQuery);
        
        if (skillSnapshot.empty) {
          const newSkillRef = doc(collection(db, 'childSkills'));
          batch.set(newSkillRef, {
            ...result,
            childId: params.id,
            lastAssessed: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          const skillDoc = skillSnapshot.docs[0];
          batch.update(skillDoc.ref, {
            status: result.status,
            lastAssessed: serverTimestamp(),
            notes: result.notes,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      // Update the child's last assessment date
      const childRef = doc(db, 'children', params.id);
      batch.update(childRef, {
        lastAssessmentDate: serverTimestamp(),
        assessmentStatus: 'completed'
      });
      
      await batch.commit();
      setIsCompleted(true);
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (err) {
      console.error('Error saving assessment:', err);
      setError('Failed to save assessment results');
    } finally {
      setLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Awesome work!
            </h2>
            <p className="text-gray-600 mb-6">
              {childData?.name} is off to a great start! Let's head to the dashboard and see what activities will have the biggest impact on {childData?.name}'s development in the coming month.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to the dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-red-50 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/children/${params.id}`}
            className="mt-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Child Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <Link
            href={`/dashboard/children/${params.id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Child Profile
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Development Assessment</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Assessment</h2>
          <p className="text-gray-600 mb-4">
            This assessment will help us understand {childData?.name}'s current developmental progress. We'll look at various skills that are typical for their age group.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How It Works:</h3>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-2">
              <li>You'll be shown age-appropriate skills one at a time</li>
              <li>For each skill, indicate if your child is "Emerging" (just starting), "Developing" (making progress), or "Mastered" (consistently shows this skill)</li>
              <li>The assessment typically takes 10-15 minutes to complete</li>
            </ul>
          </div>
          <p className="text-gray-600 mb-4">
            Based on your responses and the concerns/goals you shared, we'll create a personalized development plan to support {childData?.name}'s growth. Your weekly plan is right on the dashboard.
          </p>
        </div>

        {childData && (
          <DevelopmentAssessment
            childName={childData.name}
            birthDate={getBirthDate(childData.birthDate)}
            parentInput={childData.parentInput || { concerns: [], goals: [], notes: '' }}
            onComplete={handleAssessmentComplete}
            childId={params.id}
          />
        )}
      </div>
    </div>
  );
} 