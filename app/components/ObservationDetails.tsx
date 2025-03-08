// app/components/ObservationDetails.tsx
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { 
  Loader2, 
  Home, 
  School, 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  Share2, 
  Pencil, 
  Trash2,
  Heart,
  X,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description: string;
  area: string;
  observation?: string;
}

interface ActivityDetails {
  id: string;
  title: string;
  description?: string;
  area?: string;
  duration?: number;
  [key: string]: any;
}

interface ObservationData {
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
  environmentContext?: "home" | "school" | "other";
  observationType?: "milestone" | "interest" | "challenge" | "general";
  visibility?: string[];
  [key: string]: any;
}

interface ObservationDetailsProps {
  observationId: string;
  childId: string;
  onClose?: () => void;
  onEdit?: (observationId: string) => void;
  onDelete?: (observationId: string) => void;
}

export default function ObservationDetails({ 
  observationId, 
  childId,
  onClose,
  onEdit,
  onDelete
}: ObservationDetailsProps) {
  const [observation, setObservation] = useState<ObservationData | null>(null);
  const [activity, setActivity] = useState<ActivityDetails | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Fetch detailed observation data
  useEffect(() => {
    const fetchObservationDetails = async () => {
      try {
        setLoading(true);
        
        // Get observation data
        const observationRef = doc(db, 'progressRecords', observationId);
        const observationDoc = await getDoc(observationRef);
        
        if (!observationDoc.exists()) {
          setError('Observation not found');
          setLoading(false);
          return;
        }
        
        const observationData = { 
          id: observationDoc.id, 
          ...observationDoc.data() 
        } as ObservationData;
        setObservation(observationData);
        
        // Get activity details if available
        if (observationData.activityId) {
          const activityRef = doc(db, 'activities', observationData.activityId);
          const activityDoc = await getDoc(activityRef);
          
          if (activityDoc.exists()) {
            setActivity({ 
              id: activityDoc.id, 
              ...activityDoc.data() 
            } as ActivityDetails);
          }
        }
        
        // Get skill details if available
        if (observationData.skillsDemonstrated?.length > 0) {
          const skillsPromises = observationData.skillsDemonstrated.map(
            (skillId: string) => getDoc(doc(db, 'developmentalSkills', skillId))
          );
          
          const skillDocs = await Promise.all(skillsPromises);
          const skillsData = skillDocs
            .filter(doc => doc.exists())
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              observation: observationData.skillObservations?.[doc.id] || ''
            } as Skill));
          
          setSkills(skillsData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching observation details:', err);
        setError('Failed to load observation details');
        setLoading(false);
      }
    };
    
    if (observationId) {
      fetchObservationDetails();
    }
  }, [observationId, childId]);
  
  // Format date for display
  const formatDate = (timestamp: Timestamp | Date | undefined): string => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Get environment icon and color
  const getEnvironmentDisplay = (env?: "home" | "school" | "other") => {
    switch (env) {
      case 'home':
        return {
          icon: <Home className="h-5 w-5" />,
          label: 'Home',
          color: 'text-indigo-600 bg-indigo-50'
        };
      case 'school':
        return {
          icon: <School className="h-5 w-5" />,
          label: 'School/Classroom',
          color: 'text-purple-600 bg-purple-50'
        };
      case 'other':
        return {
          icon: <MapPin className="h-5 w-5" />,
          label: 'Other Location',
          color: 'text-emerald-600 bg-emerald-50'
        };
      default:
        return {
          icon: <Home className="h-5 w-5" />,
          label: 'Home',
          color: 'text-indigo-600 bg-indigo-50'
        };
    }
  };
  
  // Get type badge and color
  const getTypeDisplay = (type?: "milestone" | "interest" | "challenge" | "general") => {
    switch (type) {
      case 'milestone':
        return {
          icon: <CheckCircle className="h-4 w-4 mr-1" />,
          label: 'Developmental Milestone',
          color: 'bg-green-50 text-green-700 border-green-200'
        };
      case 'interest':
        return {
          icon: <Heart className="h-4 w-4 mr-1" />,
          label: 'Interest/Engagement',
          color: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'challenge':
        return {
          icon: <AlertCircle className="h-4 w-4 mr-1" />,
          label: 'Challenge/Difficulty',
          color: 'bg-amber-50 text-amber-700 border-amber-200'
        };
      case 'general':
      default:
        return {
          icon: null,
          label: 'General Observation',
          color: 'bg-gray-50 text-gray-700 border-gray-200'
        };
    }
  };
  
  // Get visibility display
  const getVisibilityDisplay = (visibility?: string[]) => {
    if (!visibility || visibility.length === 0 || visibility.includes('all')) {
      return {
        icon: <Eye className="h-4 w-4 mr-1" />,
        label: 'Visible to everyone',
        color: 'bg-green-50 text-green-700'
      };
    }
    
    if (visibility.includes('educators')) {
      return {
        icon: <Eye className="h-4 w-4 mr-1" />,
        label: 'Visible to you and educators',
        color: 'bg-blue-50 text-blue-700'
      };
    }
    
    return {
      icon: <EyeOff className="h-4 w-4 mr-1" />,
      label: 'Private (only visible to you)',
      color: 'bg-amber-50 text-amber-700'
    };
  };
  
  const handleEdit = () => {
    if (onEdit) {
      onEdit(observationId);
    }
  };
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(observationId);
      setShowDeleteConfirm(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        {error}
      </div>
    );
  }
  
  if (!observation) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-500">Observation not found</p>
      </div>
    );
  }
  
  const environment = getEnvironmentDisplay(observation.environmentContext);
  const observationType = getTypeDisplay(observation.observationType);
  const visibility = getVisibilityDisplay(observation.visibility);
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          {onClose && (
            <button
              onClick={onClose}
              className="mr-3 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-medium text-gray-900">
            Observation Details
          </h2>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
            title="Edit observation"
          >
            <Pencil className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-full"
            title="Delete observation"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          
          <button
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"
            title="Share observation"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="p-4 border-b border-red-200 bg-red-50">
          <div className="flex justify-between items-center">
            <p className="text-red-800 font-medium">
              Are you sure you want to delete this observation?
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 bg-white text-gray-700 rounded border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="p-6">
        {/* Date and context */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-1.5" />
              {formatDate(observation.date)}
            </span>
            <div className={`flex items-center ${visibility.color} px-2 py-1 rounded-full text-xs`}>
              {visibility.icon}
              <span>{visibility.label}</span>
            </div>
          </div>
          
          <div className="flex space-x-3 mb-4">
            {/* Environment badge */}
            <div className={`flex items-center ${environment.color} px-3 py-1.5 rounded-lg text-sm`}>
              {environment.icon}
              <span className="ml-1.5">{environment.label}</span>
            </div>
            
            {/* Observation type badge */}
            <div className={`flex items-center ${observationType.color} px-3 py-1.5 rounded-lg text-sm border`}>
              {observationType.icon}
              <span>{observationType.label}</span>
            </div>
          </div>
          
          {/* Activity information if available */}
          {activity && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-gray-800 mb-1">
                {activity.title}
              </h3>
              {activity.description && (
                <p className="text-sm text-gray-600 mb-2">
                  {activity.description}
                </p>
              )}
              <div className="flex text-xs text-gray-500">
                <span className="mr-3">{activity.area}</span>
                {activity.duration && (
                  <span>{activity.duration} min</span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Observation notes */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Observation Notes</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {observation.notes ? (
              <p className="text-gray-800 whitespace-pre-line">{observation.notes}</p>
            ) : (
              <p className="text-gray-500 italic">No notes added to this observation.</p>
            )}
          </div>
        </div>
        
        {/* Engagement, Interest, Difficulty */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <h4 className="text-xs font-medium text-gray-500 mb-1">Engagement</h4>
            <div className={`font-medium capitalize ${
              observation.engagementLevel === 'high' ? 'text-green-600' :
              observation.engagementLevel === 'medium' ? 'text-blue-600' :
              'text-amber-600'
            }`}>
              {observation.engagementLevel || 'Medium'}
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <h4 className="text-xs font-medium text-gray-500 mb-1">Interest</h4>
            <div className={`font-medium capitalize ${
              observation.interestLevel === 'high' ? 'text-green-600' :
              observation.interestLevel === 'medium' ? 'text-blue-600' :
              'text-amber-600'
            }`}>
              {observation.interestLevel || 'Medium'}
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <h4 className="text-xs font-medium text-gray-500 mb-1">Difficulty</h4>
            <div className={`font-medium capitalize ${
              observation.completionDifficulty === 'easy' ? 'text-green-600' :
              observation.completionDifficulty === 'appropriate' ? 'text-blue-600' :
              'text-amber-600'
            }`}>
              {observation.completionDifficulty || 'Appropriate'}
            </div>
          </div>
        </div>
        
        {/* Photos */}
        {observation.photoUrls && observation.photoUrls.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Photos</h3>
            <div className="flex flex-wrap gap-2">
              {observation.photoUrls.map((url: string, index: number) => (
                <div key={index} className="relative">
                  <img 
                    src={url} 
                    alt={`Observation photo ${index + 1}`} 
                    className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Skills Demonstrated</h3>
            <div className="space-y-3">
              {skills.map(skill => (
                <div key={skill.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-1">{skill.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{skill.description}</p>
                  {skill.observation && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">Observation: </span>
                        {skill.observation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AnotherFunction() {
  // ... function implementation ...
}