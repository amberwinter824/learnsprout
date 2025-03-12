'use client';

import { useState } from 'react';
import { Loader2, X, Camera } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import CameraCapture from './CameraCapture';
import { uploadPhotoToStorage } from '@/lib/storageService';

interface QuickObservationFormProps {
  childId: string;
  childName?: string;
  activityId?: string;
  activityTitle?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function QuickObservationForm({
  childId,
  childName = 'your child',
  activityId,
  activityTitle,
  onSuccess,
  onClose
}: QuickObservationFormProps) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Add photo state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showCameraCapture, setShowCameraCapture] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!note.trim() && !photoUrl) {
      setError('Please add a note or photo to your observation');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      // Create observation record
      await addDoc(collection(db, 'progressRecords'), {
        childId,
        activityId: activityId || null,
        activityTitle: activityTitle || null,
        notes: note,
        photoUrl: photoUrl,
        date: new Date(),
        createdAt: serverTimestamp(),
        completionStatus: 'completed',
        engagementLevel: 'medium',
        observationType: 'general',
        environmentContext: 'home'
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      setNote('');
      setPhotoUrl(null);
      
    } catch (err) {
      console.error('Error adding observation:', err);
      setError('Failed to save observation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle photo capture
  const handlePhotoCapture = (url: string, file?: File) => {
    setPhotoUrl(url);
    setShowCameraCapture(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Quick Observation</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="mb-4">
          <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
            What did you notice about {childName}?
          </label>
          <textarea
            id="note"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            placeholder={`Share what you observed about ${childName}'s engagement, interests, or challenges...`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        
        {/* Photo Capture UI */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo Documentation
          </label>
          <div className="flex items-center space-x-4">
            {!photoUrl ? (
              <button
                type="button"
                onClick={() => setShowCameraCapture(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Camera className="h-4 w-4 mr-2 text-gray-500" />
                <span>Add Photo</span>
              </button>
            ) : (
              <div className="relative">
                <img 
                  src={photoUrl} 
                  alt="Preview" 
                  className="h-20 w-20 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mb-4 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Observation'
            )}
          </button>
        </div>
      </form>
      
      {/* Camera Capture Modal */}
      {showCameraCapture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <CameraCapture
              onCapture={handlePhotoCapture}
              onCancel={() => setShowCameraCapture(false)}
              childId={childId}
              mode="both"
            />
          </div>
        </div>
      )}
    </div>
  );
} 