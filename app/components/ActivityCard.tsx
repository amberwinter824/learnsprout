// app/components/ActivityCard.tsx
'use client';

import { useState } from 'react';
import { Clock, FileText, BookOpen, ClipboardEdit } from 'lucide-react';
import ActivityDetailModal from './ActivityDetailModal';

interface ActivityCardProps {
  activity: {
    activityId: string;
    timeSlot: string;
    status: 'suggested' | 'confirmed' | 'completed';
    order: number;
    suggestionId?: string;
  };
  activityData: {
    id: string;
    title: string;
    description?: string;
    area?: string;
    duration?: number;
    difficulty?: string;
    [key: string]: any;
  } | null;
  day: string;
  childId: string;
  onStatusChange?: () => void;
}

export default function ActivityCard({ 
  activity, 
  activityData, 
  day, 
  childId, 
  onStatusChange 
}: ActivityCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'suggested':
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };
  
  const getAreaColor = (area?: string) => {
    const areaColors: Record<string, string> = {
      'practical_life': 'border-pink-200 bg-pink-50',
      'sensorial': 'border-purple-200 bg-purple-50',
      'language': 'border-blue-200 bg-blue-50',
      'mathematics': 'border-green-200 bg-green-50',
      'cultural': 'border-yellow-200 bg-yellow-50',
      'science': 'border-teal-200 bg-teal-50',
      'art': 'border-indigo-200 bg-indigo-50'
    };
    
    return area && areaColors[area] ? areaColors[area] : 'border-gray-200 bg-gray-50';
  };
  
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  
  const handleObservationRecorded = () => {
    if (onStatusChange) {
      onStatusChange();
    }
  };
  
  return (
    <>
      <div 
        className={`p-3 rounded-md border cursor-pointer transition-colors hover:shadow-md ${
          getAreaColor(activityData?.area)
        }`}
        onClick={handleOpenModal}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-sm text-gray-800 line-clamp-2">
            {activityData?.title || 'Unknown Activity'}
          </h4>
          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(activity.status)}`}>
            {activity.status}
          </span>
        </div>
        
        <div className="flex items-center text-xs text-gray-500 mt-2 space-x-3">
          {activityData?.duration && (
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {activityData.duration} min
            </span>
          )}
          <span className="capitalize">
            {activity.timeSlot}
          </span>
        </div>
        
        <div className="mt-2 flex space-x-2">
          <button 
            className="text-xs px-2 py-1 rounded bg-white bg-opacity-70 hover:bg-opacity-100 text-gray-600 flex items-center"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal();
            }}
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Details
          </button>
          
          <button 
            className="text-xs px-2 py-1 rounded bg-white bg-opacity-70 hover:bg-opacity-100 text-gray-600 flex items-center"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal();
            }}
          >
            <ClipboardEdit className="h-3 w-3 mr-1" />
            Observe
          </button>
        </div>
      </div>
      
      {isModalOpen && (
        <ActivityDetailModal
          activityId={activity.activityId}
          childId={childId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onObservationRecorded={handleObservationRecorded}
        />
      )}
    </>
  );
}