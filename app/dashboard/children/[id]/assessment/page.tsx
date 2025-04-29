'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import DevelopmentAssessment from '@/app/components/DevelopmentAssessment';
import { db } from '@/lib/firebase';
import { doc, getDoc, writeBatch, collection } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface ParentInput {
  concerns: string[];
  goals: string[];
  notes: string;
}

export default function ChildAssessmentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchChild = async () => {
      try {
        if (!currentUser) {
          throw new Error('You must be logged in');
        }

        const childDoc = await getDoc(doc(db, 'children', params.id));
        if (!childDoc.exists()) {
          throw new Error('Child not found');
        }

        const childData = childDoc.data();
        if (childData.userId !== currentUser.uid) {
          throw new Error('Unauthorized access');
        }

        setChild(childData);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching child:', err);
        setError(err.message || 'Failed to load child information');
        setLoading(false);
      }
    };

    fetchChild();
  }, [params.id, currentUser]);

  const handleAssessmentComplete = async (results: any[]) => {
    try {
      // Save assessment results to Firestore
      const batch = writeBatch(db);
      
      results.forEach(result => {
        const skillRef = doc(collection(db, 'childSkills'));
        batch.set(skillRef, {
          childId: params.id,
          skillId: result.skillId,
          status: result.status,
          lastAssessed: new Date(),
          notes: result.notes || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      
      // Redirect to child's progress page
      router.push(`/dashboard/children/${params.id}/progress`);
    } catch (err: any) {
      console.error('Error saving assessment results:', err);
      setError(err.message || 'Failed to save assessment results');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">Error</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-4">
              <Link
                href="/dashboard"
                className="text-emerald-600 hover:text-emerald-500"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={`/dashboard/children/${params.id}`}
            className="inline-flex items-center text-emerald-600 hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Child Profile
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Development Assessment for {child.name}
          </h1>

          <DevelopmentAssessment
            childName={child.name}
            birthDate={child.birthDate.toDate()}
            parentInput={child.parentInput || { concerns: [], goals: [], notes: '' }}
            onComplete={handleAssessmentComplete}
          />
        </div>
      </div>
    </div>
  );
} 