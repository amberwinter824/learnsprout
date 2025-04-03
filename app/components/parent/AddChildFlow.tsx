"use client";

import React, { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus, CheckCircle } from 'lucide-react';
import InitialMaterialsAssessment from './InitialMaterialsAssessment';
import MaterialsAssessment from './MaterialsAssessment';

interface AddChildFlowProps {
  onComplete: () => void;
}

interface ChildData {
  id?: string;
  name: string;
  age: number;
  gender?: string;
  interests?: string[];
  userId: string;
  createdAt: Date;
}

export default function AddChildFlow({ onComplete }: AddChildFlowProps) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [childData, setChildData] = useState<ChildData>({
    name: '',
    age: 0,
    userId: currentUser?.uid || '',
    createdAt: new Date()
  });

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      setError(null);

      // Add child to database
      const childRef = await addDoc(collection(db, 'children'), {
        ...childData,
        createdAt: Timestamp.now()
      });

      // Update childData with the new ID
      setChildData(prev => ({ ...prev, id: childRef.id }));

      // Move to materials assessment
      setStep(2);
    } catch (err) {
      console.error('Error adding child:', err);
      setError('Failed to add child');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialsComplete = () => {
    onComplete();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Basic Information</p>
              <p className="text-xs text-gray-500">Child's details</p>
            </div>
          </div>
          <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Materials Setup</p>
              <p className="text-xs text-gray-500">Activity materials</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Child's Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={childData.name}
              onChange={(e) => setChildData({ ...childData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700">
              Age (in years)
            </label>
            <input
              type="number"
              id="age"
              required
              min="0"
              max="18"
              value={childData.age}
              onChange={(e) => setChildData({ ...childData, age: parseInt(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
              Gender (optional)
            </label>
            <select
              id="gender"
              value={childData.gender || ''}
              onChange={(e) => setChildData({ ...childData, gender: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Child
          </button>
        </form>
      )}

      {/* Step 2: Materials Assessment */}
      {step === 2 && (
        <MaterialsAssessment
          childId={childData.id || ''}
          childAge={childData.age}
          childName={childData.name}
          onComplete={handleMaterialsComplete}
          isInitialSetup={true}
        />
      )}
    </div>
  );
} 