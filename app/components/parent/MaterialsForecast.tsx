// app/components/parent/MaterialsForecast.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';
import { ShoppingBag, ExternalLink, ChevronDown, ChevronUp, Loader2, CalendarRange, Check, X } from 'lucide-react';
import { format, addDays, addMonths, subDays, startOfDay } from 'date-fns';
import { findBestMaterialMatch, updateUserMaterial, getUserMaterials, findActivitiesWithAvailableMaterials } from '@/lib/materialsService';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface MaterialWithActivities {
  id?: string;
  name: string;
  amazonLink?: string;
  affiliateLink?: string;
  activities: string[];  // Names of activities that need this material
  activityCount: number; // How many activities use this material
  owned: boolean; // Whether the user already owns this material
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  area?: string;
  duration?: number;
  materialsNeeded?: string[];
  [key: string]: any;
}

interface MaterialsForecastProps {
  childId: string;
  period?: number; // Number of days to forecast (defaults to 90 for quarterly)
}

export default function MaterialsForecast({ childId, period = 90 }: MaterialsForecastProps) {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<MaterialWithActivities[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingMaterial, setUpdatingMaterial] = useState<string | null>(null);
  const [doableActivities, setDoableActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Get materials needed and check which ones the user already has
  useEffect(() => {
    const fetchMaterialsForecast = async () => {
      if (!currentUser?.uid) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Calculate date range for forecast
        const today = startOfDay(new Date());
        const forecastEndDate = addDays(today, period);
        
        // Get user's existing materials
        const ownedMaterialIds = await getUserMaterials(currentUser.uid);
        
        // Query for upcoming weekly plans
        const plansQuery = query(
          collection(db, 'weeklyPlans'),
          where('childId', '==', childId),
          where('weekStarting', '>=', format(today, 'yyyy-MM-dd')),
          where('weekStarting', '<=', format(forecastEndDate, 'yyyy-MM-dd'))
        );
        
        const plansSnapshot = await getDocs(plansQuery);
        
        if (plansSnapshot.empty) {
          console.log('No upcoming plans found for materials forecast');
          setMaterials([]);
          setLoading(false);
          return;
        }
        
        console.log('Found weekly plans:', plansSnapshot.size);
        
        // Extract all activity IDs from upcoming plans
        const activityIds: string[] = [];
        const planDates: string[] = [];
        
        plansSnapshot.forEach(doc => {
          const planData = doc.data();
          planDates.push(planData.weekStarting);
          console.log('Processing plan for week:', planData.weekStarting);
          
          // Extract activities from all days
          const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          
          dayNames.forEach(day => {
            const dayActivities = planData[day] || [];
            console.log(`Found ${dayActivities.length} activities for ${day}`);
            dayActivities.forEach((activity: any) => {
              if (activity.activityId) {
                activityIds.push(activity.activityId);
              }
            });
          });
        });
        
        console.log(`Found ${activityIds.length} activities across ${planDates.length} weeks`);
        
        // Remove duplicates
        const uniqueActivityIds = [...new Set(activityIds)];
        console.log('Unique activity IDs:', uniqueActivityIds);
        
        if (uniqueActivityIds.length === 0) {
          setMaterials([]);
          setLoading(false);
          return;
        }
        
        // Fetch activity details to get materials
        const activitiesWithMaterials = await Promise.all(
          uniqueActivityIds.map(async (activityId) => {
            try {
              const activityDoc = await getDoc(doc(db, 'activities', activityId));
              
              if (activityDoc.exists()) {
                const data = activityDoc.data();
                console.log(`Activity ${activityId} materials:`, data.materialsNeeded);
                return {
                  id: activityId,
                  title: data.title || 'Untitled Activity',
                  materialsNeeded: data.materialsNeeded || []
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching activity ${activityId}:`, error);
              return null;
            }
          })
        );
        
        // Filter out null results and activities with no materials
        const validActivities = activitiesWithMaterials.filter(
          activity => activity !== null && activity.materialsNeeded?.length > 0
        );
        
        console.log('Activities with materials:', validActivities.length);
        
        // Process materials into a unified list with de-duplication
        const materialMap = new Map<string, MaterialWithActivities>();
        
        // Get all materials from our collection
        const materialsQuery = query(collection(db, 'materials'));
        const materialsSnapshot = await getDocs(materialsQuery);
        const materialLookup = new Map();
        
        materialsSnapshot.forEach(doc => {
          materialLookup.set(doc.data().normalizedName, {
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Process each activity and its materials
        for (const activity of validActivities) {
          if (!activity) continue;
          
          for (const materialName of activity.materialsNeeded) {
            // Normalize the material name for lookup
            const normalizedName = materialName.trim().toLowerCase();
            
            // Look up the material in our collection
            const materialData = materialLookup.get(normalizedName);
            
            if (materialData) {
              // We found a match in our database
              const key = materialData.id;
              
              if (materialMap.has(key)) {
                // Update existing entry
                const existing = materialMap.get(key)!;
                if (!existing.activities.includes(activity.title)) {
                  existing.activities.push(activity.title);
                  existing.activityCount += 1;
                }
              } else {
                // Create new entry
                materialMap.set(key, {
                  id: materialData.id,
                  name: materialData.name,
                  amazonLink: materialData.amazonLink,
                  affiliateLink: materialData.affiliateLink,
                  activities: [activity.title],
                  activityCount: 1,
                  owned: ownedMaterialIds.includes(materialData.id)
                });
              }
            } else {
              // No match in database, create an entry without links
              
              if (materialMap.has(normalizedName)) {
                // Update existing entry
                const existing = materialMap.get(normalizedName)!;
                if (!existing.activities.includes(activity.title)) {
                  existing.activities.push(activity.title);
                  existing.activityCount += 1;
                }
              } else {
                // Create new entry
                materialMap.set(normalizedName, {
                  name: materialName,
                  activities: [activity.title],
                  activityCount: 1,
                  owned: false
                });
              }
            }
          }
        }
        
        // Convert map to array and sort: first by not owned, then by activity count
        const materialsList = Array.from(materialMap.values())
          .sort((a, b) => {
            // First sort by ownership (not owned first)
            if (a.owned !== b.owned) return a.owned ? 1 : -1;
            // Then sort by activity count (most used first)
            return b.activityCount - a.activityCount;
          });
        
        setMaterials(materialsList);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching materials forecast:', error);
        setError('Failed to load materials forecast');
        setLoading(false);
      }
    };
    
    if (childId && currentUser?.uid) {
      fetchMaterialsForecast();
    }
  }, [childId, period, currentUser]);

  // Add new useEffect for doable activities
  useEffect(() => {
    const fetchDoableActivities = async () => {
      if (!currentUser?.uid) return;
      
      setLoadingActivities(true);
      try {
        const activityIds = await findActivitiesWithAvailableMaterials(currentUser.uid, childId, period);
        
        // Fetch complete activity data for each ID
        const activitiesRef = collection(db, 'activities');
        const activitiesSnapshot = await getDocs(activitiesRef);
        const activities = activitiesSnapshot.docs
          .filter(doc => activityIds.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Activity[];
        
        setDoableActivities(activities);
      } catch (err) {
        console.error('Error fetching doable activities:', err);
        setError('Failed to load activities you can do now');
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchDoableActivities();
  }, [currentUser?.uid, childId, period]);

  // Handle marking a material as owned
  const handleToggleOwned = async (materialId: string, currentlyOwned: boolean) => {
    if (!currentUser?.uid || !materialId) return;
    
    try {
      setUpdatingMaterial(materialId);
      
      // Update in database
      await updateUserMaterial(currentUser.uid, materialId, !currentlyOwned);
      
      // Update local state
      setMaterials(prevMaterials => 
        prevMaterials.map(material => 
          material.id === materialId 
            ? { ...material, owned: !currentlyOwned } 
            : material
        )
      );
      
      setUpdatingMaterial(null);
    } catch (error) {
      console.error('Error updating material ownership:', error);
      setUpdatingMaterial(null);
    }
  };

  // Helper function to format area names
  const formatArea = (area?: string): string => {
    if (!area) return 'Other';
    
    return area
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to get area color
  const getAreaColor = (area?: string): string => {
    if (!area) return 'bg-gray-100 text-gray-800';
    
    switch(area) {
      case 'practical_life': return 'bg-blue-100 text-blue-800';
      case 'sensorial': return 'bg-purple-100 text-purple-800';
      case 'language': return 'bg-green-100 text-green-800';
      case 'mathematics': return 'bg-red-100 text-red-800';
      case 'cultural': return 'bg-amber-100 text-amber-800';
      case 'motor': return 'bg-indigo-100 text-indigo-800';
      case 'cognitive': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm py-2">
        {error}
      </div>
    );
  }

  // Count materials we need to get (not owned)
  const materialsToGet = materials.filter(m => !m.owned).length;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div 
        className="px-4 py-3 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <ShoppingBag className="h-5 w-5 text-emerald-500 mr-2" />
          <h3 className="font-medium text-gray-900">Seasonal Materials Forecast</h3>
          <div className="ml-2 flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            <CalendarRange className="h-3 w-3 mr-1" />
            Next {period} days
          </div>
          <span className="ml-2 text-xs text-gray-500">
            ({materialsToGet} needed)
          </span>
        </div>
        <button 
          className="text-gray-400 hover:text-gray-600"
          aria-label={expanded ? "Collapse materials list" : "Expand materials forecast"}
        >
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
      
      {expanded && (
        <div className="p-4">
          {materials.length > 0 ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                These are all the materials you'll need for activities over the next {period} days. 
                Check the box next to items you already have.
              </p>
              
              {/* Materials we need to get (not owned) */}
              {materials.filter(m => !m.owned).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-red-600 mb-2">
                    Materials to Purchase:
                  </h4>
                  <ul className="space-y-2 divide-y divide-gray-100">
                    {materials.filter(m => !m.owned).map((material, index) => (
                      <li key={index} className="flex justify-between items-center py-2">
                        <div className="flex items-center">
                          <div className="mr-3">
                            <input
                              type="checkbox"
                              id={`material-${material.id || index}`}
                              checked={material.owned}
                              onChange={() => handleToggleOwned(material.id!, material.owned)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                              disabled={updatingMaterial === material.id}
                            />
                          </div>
                          <div>
                            <span className="text-gray-800 font-medium">{material.name}</span>
                            <div className="text-xs text-gray-500">
                              Used in {material.activityCount} {material.activityCount === 1 ? 'activity' : 'activities'}
                            </div>
                          </div>
                        </div>
                        {(material.affiliateLink || material.amazonLink) && (
                          <a 
                            href={material.affiliateLink || material.amazonLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center bg-blue-50 px-2 py-1 rounded"
                          >
                            Buy
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Materials we already have */}
              {materials.filter(m => m.owned).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">
                    Materials You Already Have:
                  </h4>
                  <ul className="space-y-2 divide-y divide-gray-100">
                    {materials.filter(m => m.owned).map((material, index) => (
                      <li key={index} className="flex justify-between items-center py-2 opacity-75">
                        <div className="flex items-center">
                          <div className="mr-3">
                            <input
                              type="checkbox"
                              id={`material-owned-${material.id || index}`}
                              checked={material.owned}
                              onChange={() => handleToggleOwned(material.id!, material.owned)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                              disabled={updatingMaterial === material.id}
                            />
                          </div>
                          <div>
                            <span className="text-gray-800">{material.name}</span>
                            <div className="text-xs text-gray-500">
                              Used in {material.activityCount} {material.activityCount === 1 ? 'activity' : 'activities'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                          <Check className="h-3 w-3 mr-1" />
                          In your inventory
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Activities You Can Do Now */}
              {materials.filter(m => m.owned).length > 0 && (
                <div className="mt-8">
                  <h4 className="text-sm font-medium text-emerald-600 mb-3">
                    Activities You Can Do Now
                  </h4>
                  
                  {loadingActivities ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    </div>
                  ) : doableActivities.length > 0 ? (
                    <ul className="space-y-3">
                      {doableActivities.map((activity) => (
                        <li key={activity.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-900">{activity.title}</h5>
                              <div className="flex items-center mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getAreaColor(activity.area)}`}>
                                  {formatArea(activity.area)}
                                </span>
                                {activity.duration && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    {activity.duration} min
                                  </span>
                                )}
                              </div>
                              {activity.description && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                            <Link
                              href={`/dashboard/activities/${activity.id}?childId=${childId}`}
                              className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 transition-colors"
                            >
                              View Activity
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">
                        Mark materials as owned to see activities you can do now.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-6 bg-blue-50 rounded-md p-3 text-sm text-blue-800">
                <p className="font-medium">Shopping tip</p>
                <p className="text-xs mt-1">
                  Purchase these materials in advance to be prepared for all upcoming activities. 
                  Many materials can be reused across multiple activities.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">No materials needed for upcoming activities.</p>
              <p className="text-sm text-gray-400 mt-2">
                This could be because there are no activities planned for the next {period} days.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}