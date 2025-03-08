// app/components/ObservationList.tsx
'use client';

import { useState, useEffect } from 'react';
import { getVisibleProgressRecords } from '@/lib/progressTracking';
import { useAuth } from '@/contexts/AuthContext';
import { Timestamp } from 'firebase/firestore';
import { 
  Loader2, 
  Home, 
  School, 
  MapPin, 
  Calendar, 
  ClipboardList, 
  Filter, 
  Check, 
  X,
  Image,
  Eye
} from 'lucide-react';

interface ObservationListProps {
  childId: string;
  limit?: number;
  showFilters?: boolean;
  onObservationSelect?: (observationId: string) => void;
}

interface ObservationFilters {
  environments: ("home" | "school" | "other")[];
  types: ("milestone" | "interest" | "challenge" | "general")[];
  dateRange: "week" | "month" | "all";
}

export default function ObservationList({ 
  childId, 
  limit = 10,
  showFilters = true,
  onObservationSelect 
}: ObservationListProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<ObservationFilters>({
    environments: ["home", "school", "other"],
    types: ["milestone", "interest", "challenge", "general"],
    dateRange: "all"
  });
  
  // Fetch observations with visibility handling
  useEffect(() => {
    const fetchObservations = async () => {
      if (!childId || !currentUser) return;
      
      try {
        setLoading(true);
        const records = await getVisibleProgressRecords(
          childId, 
          currentUser.uid,
          currentUser.role || 'parent'
        );
        
        // Apply client-side filters
        let filteredRecords = [...records];
        
        // Apply environment filter
        if (filters.environments.length > 0 && filters.environments.length < 3) {
          filteredRecords = filteredRecords.filter(record => 
            record.environmentContext ? 
              filters.environments.includes(record.environmentContext) : 
              // If no environment context, include if "home" is in filters (default)
              filters.environments.includes("home")
          );
        }
        
        // Apply type filter
        if (filters.types.length > 0 && filters.types.length < 4) {
          filteredRecords = filteredRecords.filter(record => 
            record.observationType ? 
              filters.types.includes(record.observationType) : 
              // If no type, include if "general" is in filters (default)
              filters.types.includes("general")
          );
        }
        
        // Apply date range filter
        if (filters.dateRange !== "all") {
          const now = new Date();
          let cutoffDate: Date;
          
          if (filters.dateRange === "week") {
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          } else if (filters.dateRange === "month") {
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          } else {
            cutoffDate = new Date(0); // Beginning of time
          }
          
          filteredRecords = filteredRecords.filter(record => {
            const recordDate = record.date instanceof Timestamp ? 
              record.date.toDate() : 
              new Date(record.date);
            return recordDate >= cutoffDate;
          });
        }
        
        // Sort by date (newest first)
        filteredRecords.sort((a, b) => {
          const dateA = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
          const dateB = b.date instanceof Timestamp ? b.date.toDate() : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Apply limit if provided
        if (limit > 0) {
          filteredRecords = filteredRecords.slice(0, limit);
        }
        
        setObservations(filteredRecords);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching observations:', err);
        setError('Failed to load observations');
        setLoading(false);
      }
    };
    
    fetchObservations();
  }, [childId, currentUser, limit, filters]);
  
  // Toggle a filter value
  const toggleFilter = (
    filterType: 'environments' | 'types',
    value: string
  ) => {
    setFilters(prev => {
      const currentValues = prev[filterType] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      // Ensure at least one filter is selected
      if (newValues.length === 0) {
        return prev;
      }
      
      return {
        ...prev,
        [filterType]: newValues
      };
    });
  };
  
  // Set date range filter
  const setDateRange = (range: "week" | "month" | "all") => {
    setFilters(prev => ({
      ...prev,
      dateRange: range
    }));
  };
  
  // Format date for display
  const formatDate = (date: Timestamp | Date): string => {
    const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get environment icon
  const getEnvironmentIcon = (env?: "home" | "school" | "other") => {
    switch (env) {
      case 'home':
        return <Home className="h-4 w-4 text-indigo-500" />;
      case 'school':
        return <School className="h-4 w-4 text-purple-500" />;
      case 'other':
        return <MapPin className="h-4 w-4 text-emerald-500" />;
      default:
        return <Home className="h-4 w-4 text-gray-400" />;
    }
  };
  
  // Get type badge
  const getTypeBadge = (type?: "milestone" | "interest" | "challenge" | "general") => {
    switch (type) {
      case 'milestone':
        return (
          <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
            Milestone
          </span>
        );
      case 'interest':
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
            Interest
          </span>
        );
      case 'challenge':
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
            Challenge
          </span>
        );
      case 'general':
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-50 text-gray-700 text-xs rounded-full">
            General
          </span>
        );
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
  
  if (observations.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-gray-700 font-medium mb-2">No observations found</h3>
        <p className="text-gray-500 text-sm">
          Record an observation for this child to see it here.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
            <button 
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>
          
          {showFilterMenu && (
            <div className="mt-3 space-y-4">
              {/* Environment Filter */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">Environment</h4>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => toggleFilter('environments', 'home')}
                    className={`flex items-center px-2 py-1 rounded-full text-xs ${
                      filters.environments.includes('home') 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Home className="h-3 w-3 mr-1" />
                    Home
                    {filters.environments.includes('home') && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => toggleFilter('environments', 'school')}
                    className={`flex items-center px-2 py-1 rounded-full text-xs ${
                      filters.environments.includes('school') 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <School className="h-3 w-3 mr-1" />
                    School
                    {filters.environments.includes('school') && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => toggleFilter('environments', 'other')}
                    className={`flex items-center px-2 py-1 rounded-full text-xs ${
                      filters.environments.includes('other') 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    Other
                    {filters.environments.includes('other') && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Type Filter */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">Observation Type</h4>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => toggleFilter('types', 'milestone')}
                    className={`px-2 py-1 rounded-full text-xs ${
                      filters.types.includes('milestone') 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    Milestone
                    {filters.types.includes('milestone') && (
                      <Check className="h-3 w-3 ml-1 inline-block" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => toggleFilter('types', 'interest')}
                    className={`px-2 py-1 rounded-full text-xs ${
                      filters.types.includes('interest') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    Interest
                    {filters.types.includes('interest') && (
                      <Check className="h-3 w-3 ml-1 inline-block" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => toggleFilter('types', 'general')}
                    className={`px-2 py-1 rounded-full text-xs ${
                      filters.types.includes('general') 
                        ? 'bg-gray-200 text-gray-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    General
                    {filters.types.includes('general') && (
                      <Check className="h-3 w-3 ml-1 inline-block" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Date Range Filter */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-2">Time Period</h4>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setDateRange('week')}
                    className={`px-2 py-1 rounded-full text-xs ${
                      filters.dateRange === 'week' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    Last Week
                  </button>
                  
                  <button 
                    onClick={() => setDateRange('month')}
                    className={`px-2 py-1 rounded-full text-xs ${
                      filters.dateRange === 'month' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    Last Month
                  </button>
                  
                  <button 
                    onClick={() => setDateRange('all')}
                    className={`px-2 py-1 rounded-full text-xs ${
                      filters.dateRange === 'all' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    All Time
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Observations List */}
      <div className="space-y-4">
        {observations.map(observation => (
          <div 
            key={observation.id} 
            className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onObservationSelect && onObservationSelect(observation.id)}
          >
            <div className="p-4">
              {/* Header with date and environment */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  {getEnvironmentIcon(observation.environmentContext)}
                  <span className="text-sm font-medium text-gray-700 ml-1">
                    {observation.environmentContext || 'Home'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getTypeBadge(observation.observationType)}
                  <span className="text-xs text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(observation.date)}
                  </span>
                </div>
              </div>
              
              {/* Activity title if available */}
              {observation.activityTitle && (
                <h3 className="text-sm font-medium text-gray-800 mb-2">
                  {observation.activityTitle}
                </h3>
              )}
              
              {/* Notes */}
              {observation.notes && (
                <div className="text-sm text-gray-600 mb-3">
                  {observation.notes.length > 150 
                    ? `${observation.notes.substring(0, 150)}...` 
                    : observation.notes}
                </div>
              )}
              
              {/* Footer with status and skills */}
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className={`px-2 py-0.5 rounded-full capitalize ${
                    observation.completionStatus === 'completed' 
                      ? 'bg-green-50 text-green-700' 
                      : observation.completionStatus === 'in_progress'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {observation.completionStatus?.replace('_', ' ') || 'Completed'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Photo indicator */}
                  {observation.photoUrls && observation.photoUrls.length > 0 && (
                    <span className="text-gray-500">
                      <Image className="h-3 w-3" />
                    </span>
                  )}
                  
                  {/* Skills count */}
                  {observation.skillsDemonstrated && observation.skillsDemonstrated.length > 0 && (
                    <span className="text-gray-500">
                      {observation.skillsDemonstrated.length} skill{observation.skillsDemonstrated.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  
                  {/* Visibility indicator */}
                  {observation.visibility && (
                    <span className="text-gray-500">
                      <Eye className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Show more link if limited */}
      {limit > 0 && observations.length === limit && (
        <div className="text-center py-2">
          <button 
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            onClick={() => onObservationSelect && onObservationSelect('view-all')}
          >
            View all observations
          </button>
        </div>
      )}
    </div>
  );
}