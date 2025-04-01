"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllActivities } from '@/lib/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { getUserChildren } from '@/lib/dataService';
import { Search, Filter, BookOpen, Clock, Users, ChevronRight, X } from 'lucide-react';
import QuickObservationForm from '@/app/components/parent/QuickObservationForm';

interface Child {
  id: string;
  name: string;
  birthDate?: any;
  ageGroup?: string;
  interests?: string[];
  notes?: string;
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  ageRanges?: string[];
  area?: string;
  materialsNeeded?: string[];
  duration?: number;
  difficulty?: string;
  status?: string;
  imageUrl?: string;
  prerequisites?: string[];
  nextSteps?: string[];
  relatedActivities?: string[];
  skillsAddressed?: string[];
}

export default function ActivitiesPage() {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('');
  const [filterAgeGroup, setFilterAgeGroup] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showQuickActivities, setShowQuickActivities] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [showObservationForm, setShowObservationForm] = useState<boolean>(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all activities
        const activitiesData = await getAllActivities();
        // Validate activities data
        const validatedActivities = activitiesData.map(activity => {
          if (!('title' in activity)) {
            throw new Error('Invalid activity data received');
          }
          return activity as Activity;
        });
        setActivities(validatedActivities);
        
        // Fetch user's children for the "Add Observation" feature
        if (currentUser?.uid) {
          const childrenData = await getUserChildren(currentUser.uid);
          // Validate children data
          const validatedChildren = childrenData.map(child => {
            if (!('name' in child)) {
              throw new Error('Invalid child data received');
            }
            return child as Child;
          });
          setChildren(validatedChildren);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser]);

  // Filter activities based on search and filter criteria
  const filteredActivities = activities.filter(activity => {
    // Search term filter (title, description, or instructions)
    const matchesSearch = 
      (activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (activity.instructions?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    // Area filter
    const matchesArea = filterArea ? activity.area === filterArea : true;
    
    // Age group filter
    const matchesAgeGroup = filterAgeGroup 
      ? activity.ageRanges?.includes(filterAgeGroup) || false
      : true;
    
    // Difficulty filter
    const matchesDifficulty = filterDifficulty 
      ? activity.difficulty === filterDifficulty 
      : true;

    // Quick activities filter
    const matchesQuickFilter = showQuickActivities 
      ? activity.duration && activity.duration <= 10
      : true;
    
    return matchesSearch && matchesArea && matchesAgeGroup && matchesDifficulty && matchesQuickFilter;
  });

  // Get unique areas, age groups, and difficulty levels for filters
  const areas = Array.from(new Set(activities.map(a => a.area).filter(Boolean)));
  
  // Flatten and get unique age ranges
  const ageGroups = Array.from(new Set(
    activities
      .flatMap(a => a.ageRanges || [])
      .filter(Boolean)
  ));
  
  const difficultyLevels = Array.from(new Set(
    activities.map(a => a.difficulty).filter(Boolean)
  ));

  // Format area name for display
  const formatAreaName = (area?: string): string => {
    if (!area) return '';
    return area
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get area color for visual distinction
  const getAreaColor = (area?: string): string => {
    if (!area) return 'bg-gray-100 text-gray-800';
    
    switch(area) {
      case 'practical_life': return 'bg-blue-100 text-blue-800';
      case 'sensorial': return 'bg-purple-100 text-purple-800';
      case 'language': return 'bg-green-100 text-green-800';
      case 'mathematics': return 'bg-red-100 text-red-800';
      case 'cultural': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Reset all filters
  const resetFilters = (): void => {
    setSearchTerm('');
    setFilterArea('');
    setFilterAgeGroup('');
    setFilterDifficulty('');
  };

  const handleObservationSuccess = () => {
    setShowObservationForm(false);
    setSelectedActivity(null);
    setSelectedChild(null);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Montessori Activities</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and explore age-appropriate Montessori activities
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowQuickActivities(!showQuickActivities)}
                className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium ${
                  showQuickActivities
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Clock className="h-4 w-4 mr-2" />
                {showQuickActivities ? 'Show All Activities' : 'Quick Activities Only'}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {showFilters ? '(Hide)' : '(Show)'}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="filterArea" className="block text-sm font-medium text-gray-700 mb-1">
                  Area
                </label>
                <select
                  id="filterArea"
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                >
                  <option value="">All Areas</option>
                  {areas.map(area => (
                    <option key={area} value={area}>
                      {formatAreaName(area)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="filterAgeGroup" className="block text-sm font-medium text-gray-700 mb-1">
                  Age Group
                </label>
                <select
                  id="filterAgeGroup"
                  value={filterAgeGroup}
                  onChange={(e) => setFilterAgeGroup(e.target.value)}
                  className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                >
                  <option value="">All Ages</option>
                  {ageGroups.map(age => (
                    <option key={age} value={age}>
                      {age} years
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="filterDifficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  id="filterDifficulty"
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                >
                  <option value="">Any Difficulty</option>
                  {difficultyLevels.map(level => (
                    <option key={level} value={level}>
                      {(level || '').charAt(0).toUpperCase() + (level || '').slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading activities...</p>
          </div>
        ) : filteredActivities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAreaColor(activity.area)}`}>
                      {formatAreaName(activity.area)}
                    </span>
                    {activity.duration && activity.duration <= 10 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <Clock className="h-3 w-3 mr-1" />
                        Quick
                      </span>
                    )}
                  </div>
                  
                  <h3 className="mt-2 text-lg font-medium text-gray-900 line-clamp-1">
                    {activity.title}
                  </h3>
                  
                  {activity.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  
                  <div className="mt-3 flex items-center text-sm text-gray-500 space-x-4">
                    {activity.ageRanges && activity.ageRanges.length > 0 && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{activity.ageRanges.join(', ')} years</span>
                      </div>
                    )}
                    
                    {activity.duration && (
                      <div className="flex items-center font-medium text-emerald-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{activity.duration} min</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <Link 
                      href={`/dashboard/activities/${activity.id}`}
                      className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-500"
                    >
                      View Details
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                    
                    {children.length > 0 && (
                      <div className="relative inline-block text-left">
                        <select
                          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                          onChange={(e) => {
                            if (e.target.value) {
                              const childId = e.target.value;
                              setSelectedChild(childId);
                              setSelectedActivity(activity);
                              setShowObservationForm(true);
                            }
                          }}
                          value=""
                        >
                          <option value="" disabled>Add Observation</option>
                          {children.map(child => (
                            <option key={child.id} value={child.id}>
                              For {child.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchTerm || filterArea || filterAgeGroup || filterDifficulty ? 
                "No activities match your current search and filter criteria. Try adjusting your filters or search term." : 
                "There are no activities available at the moment."}
            </p>
            {(searchTerm || filterArea || filterAgeGroup || filterDifficulty) && (
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Observation Form Modal */}
      {showObservationForm && selectedActivity && selectedChild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Add Observation for {selectedActivity.title}</h2>
              <button
                onClick={() => {
                  setShowObservationForm(false);
                  setSelectedActivity(null);
                  setSelectedChild(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <QuickObservationForm
                activityId={selectedActivity.id}
                childId={selectedChild}
                onSuccess={handleObservationSuccess}
                onClose={() => {
                  setShowObservationForm(false);
                  setSelectedActivity(null);
                  setSelectedChild(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}