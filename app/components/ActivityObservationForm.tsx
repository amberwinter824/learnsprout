// app/components/ActivityObservationForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { addProgressRecord, getActivityProgress } from '@/lib/progressTracking';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  area: string;
}

interface ProgressRecord {
  id: string;
  childId: string;
  activityId: string;
  date: Timestamp | Date;
  completionStatus: 'started' | 'in_progress' | 'completed';
  engagementLevel: 'low' | 'medium' | 'high';
  interestLevel: 'low' | 'medium' | 'high';
  completionDifficulty: 'easy' | 'appropriate' | 'challenging';
  notes: string;
  photoUrls?: string[];
  skillsDemonstrated: string[];
  skillObservations?: Record<string, string>;
}

interface ActivityData {
  id?: string;
  title: string;
  description?: string;
  area?: string;
  skillsAddressed?: string[];
  [key: string]: any; // For any other properties
}

interface ActivityObservationFormProps {
  activityId: string;
  childId: string;
  onSuccess?: () => void;
}

export function ActivityObservationForm({ activityId, childId, onSuccess }: ActivityObservationFormProps) {
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [relatedSkills, setRelatedSkills] = useState<Skill[]>([]);
  const [previousObservations, setPreviousObservations] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const { currentUser } = useAuth();
  
  // Form state
  const [completionStatus, setCompletionStatus] = useState<'started' | 'in_progress' | 'completed'>('completed');
  const [engagementLevel, setEngagementLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [interestLevel, setInterestLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [completionDifficulty, setCompletionDifficulty] = useState<'easy' | 'appropriate' | 'challenging'>('appropriate');
  const [notes, setNotes] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillObservations, setSkillObservations] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchActivityAndSkills = async () => {
      try {
        setLoading(true);
        
        // Get activity details
        const activityRef = doc(db, 'activities', activityId);
        const activityDoc = await getDoc(activityRef);
        
        if (!activityDoc.exists()) {
          setError('Activity not found');
          setLoading(false);
          return;
        }
        
        const activityData = activityDoc.data() as ActivityData;
        activityData.id = activityDoc.id;
        setActivity(activityData);
        
        // Get related skills
        if (activityData.skillsAddressed && activityData.skillsAddressed.length > 0) {
          const skillPromises = activityData.skillsAddressed.map(skillId => 
            getDoc(doc(db, 'developmentalSkills', skillId))
          );
          
          const skillDocs = await Promise.all(skillPromises);
          
          const skills = skillDocs
            .filter(doc => doc.exists())
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Skill));
          
          setRelatedSkills(skills);
          
          // Pre-select the skills
          setSelectedSkills(skills.map(skill => skill.id));
        }
        
        // Get previous observations for this activity and child
        const previousRecords = await getActivityProgress(childId, activityId);
        setPreviousObservations(previousRecords);
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching activity and skills:', err);
        setError('Failed to load activity details');
        setLoading(false);
      }
    };
    
    if (activityId && childId) {
      fetchActivityAndSkills();
    }
  }, [activityId, childId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!currentUser || !childId || !activityId) {
      setError('Missing required information');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      // Prepare the progress record data
      const progressData = {
        activityId,
        date: new Date(),
        completionStatus,
        engagementLevel,
        interestLevel,
        completionDifficulty,
        notes,
        skillsDemonstrated: selectedSkills,
        skillObservations
      };
      
      // Add the progress record
      await addProgressRecord(childId, currentUser.uid, progressData);
      
      // Get updated observations
      const updatedObservations = await getActivityProgress(childId, activityId);
      setPreviousObservations(updatedObservations);
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset the form (except skills)
      setCompletionStatus('completed');
      setEngagementLevel('medium');
      setInterestLevel('medium');
      setCompletionDifficulty('appropriate');
      setNotes('');
      setSkillObservations({});
      
      // Show success message
      setSuccessMessage('Observation recorded successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      console.error('Error adding observation:', err);
      setError('Failed to save observation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev => {
      if (prev.includes(skillId)) {
        return prev.filter(id => id !== skillId);
      } else {
        return [...prev, skillId];
      }
    });
  };

  const handleSkillObservationChange = (skillId: string, observation: string) => {
    setSkillObservations(prev => ({
      ...prev,
      [skillId]: observation
    }));
  };

  // Format date for display
  const formatDate = (timestamp: Timestamp | Date | undefined): string => {
    if (!timestamp) return 'Unknown date';
    
    const date = 'toDate' in timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md">
        <p>Activity information could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 border-b border-green-100 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {successMessage}
        </div>
      )}
      
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Record Observation</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Completion Status
            </label>
            <div className="flex space-x-4">
              {(['started', 'in_progress', 'completed'] as const).map(status => (
                <label key={status} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="completionStatus"
                    value={status}
                    checked={completionStatus === status}
                    onChange={() => setCompletionStatus(status)}
                    className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">
                    {status.replace('_', ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Engagement Level
              </label>
              <select
                value={engagementLevel}
                onChange={(e) => setEngagementLevel(e.target.value as 'low' | 'medium' | 'high')}
                className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interest Level
              </label>
              <select
                value={interestLevel}
                onChange={(e) => setInterestLevel(e.target.value as 'low' | 'medium' | 'high')}
                className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                value={completionDifficulty}
                onChange={(e) => setCompletionDifficulty(e.target.value as 'easy' | 'appropriate' | 'challenging')}
                className="mt-1 block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              >
                <option value="easy">Easy</option>
                <option value="appropriate">Appropriate</option>
                <option value="challenging">Challenging</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              General Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="Record your observations about this activity..."
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills Demonstrated
            </label>
            <div className="space-y-4 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-4">
              {relatedSkills.length > 0 ? (
                relatedSkills.map(skill => (
                  <div key={skill.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id={`skill-${skill.id}`}
                          type="checkbox"
                          checked={selectedSkills.includes(skill.id)}
                          onChange={() => handleSkillToggle(skill.id)}
                          className="focus:ring-emerald-500 h-4 w-4 text-emerald-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`skill-${skill.id}`} className="font-medium text-gray-700">
                          {skill.name}
                        </label>
                        <p className="text-gray-500">{skill.description}</p>
                      </div>
                    </div>
                    
                    {selectedSkills.includes(skill.id) && (
                      <div className="mt-3 ml-7">
                        <label htmlFor={`observation-${skill.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Detailed Observation
                        </label>
                        <textarea
                          id={`observation-${skill.id}`}
                          value={skillObservations[skill.id] || ''}
                          onChange={(e) => handleSkillObservationChange(skill.id, e.target.value)}
                          rows={2}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                          placeholder={`Describe how the child demonstrated the '${skill.name}' skill...`}
                        ></textarea>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm italic">No skills are associated with this activity.</p>
              )}
            </div>
          </div>
          
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
      </div>
      
      {/* Previous Observations */}
      {previousObservations.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-5 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Previous Observations</h4>
          
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {previousObservations.map((record) => (
              <div key={record.id} className="bg-white p-4 rounded-md border border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    {formatDate(record.date)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    record.completionStatus === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : record.completionStatus === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {record.completionStatus.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Engagement:</span>{' '}
                    <span className="capitalize">{record.engagementLevel}</span>
                  </div>
                  <div>
                    <span className="font-medium">Interest:</span>{' '}
                    <span className="capitalize">{record.interestLevel}</span>
                  </div>
                  <div>
                    <span className="font-medium">Difficulty:</span>{' '}
                    <span className="capitalize">{record.completionDifficulty}</span>
                  </div>
                </div>
                
                {record.notes && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-700">{record.notes}</p>
                  </div>
                )}
                
                {record.skillsDemonstrated && record.skillsDemonstrated.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-gray-700 mb-1">Skills Demonstrated:</h5>
                    <div className="flex flex-wrap gap-1">
                      {record.skillsDemonstrated.map(skillId => {
                        const skill = relatedSkills.find(s => s.id === skillId);
                        return (
                          <span key={skillId} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                            {skill ? skill.name : skillId}
                          </span>
                        );
                      })}
                    </div>
                    
                    {record.skillObservations && Object.keys(record.skillObservations).length > 0 && (
                      <div className="mt-2 text-xs">
                        {Object.entries(record.skillObservations).map(([skillId, observation]) => {
                          const skill = relatedSkills.find(s => s.id === skillId);
                          return (
                            <div key={skillId} className="mt-1">
                              <span className="font-medium">{skill ? skill.name : skillId}:</span>{' '}
                              <span className="text-gray-600">{observation}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}