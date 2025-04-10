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
  normalizedName: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  isReusable: boolean;
  isOptional: boolean;
  amazonLink?: string;
  affiliateLink?: string;
  activities: string[];
  activityCount: number;
  owned: boolean;
  materialType: 'household' | 'basic' | 'advanced';
  householdAlternative?: string;
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
          const data = doc.data();
          // Store by both normalized name and alternative names
          materialLookup.set(data.normalizedName, {
            id: doc.id,
            ...data
          });
          // Also store by alternative names if they exist
          if (data.alternativeNames && Array.isArray(data.alternativeNames)) {
            data.alternativeNames.forEach((altName: string) => {
              materialLookup.set(altName.trim().toLowerCase(), {
                id: doc.id,
                ...data
              });
            });
          }
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
                  normalizedName: materialData.normalizedName,
                  category: materialData.category,
                  description: materialData.description,
                  quantity: materialData.quantity,
                  unit: materialData.unit,
                  isReusable: materialData.isReusable,
                  isOptional: materialData.isOptional,
                  amazonLink: materialData.amazonLink,
                  affiliateLink: materialData.affiliateLink,
                  activities: [activity.title],
                  activityCount: 1,
                  owned: ownedMaterialIds.includes(materialData.id),
                  materialType: materialData.materialType,
                  householdAlternative: materialData.householdAlternative
                });
              }
            } else {
              console.log(`No match found for material: ${materialName} (normalized: ${normalizedName})`);
              // No match in database, create an entry without links
              if (materialMap.has(normalizedName)) {
                // Update existing entry
                const existing = materialMap.get(normalizedName)!;
                if (!existing.activities.includes(activity.title)) {
                  existing.activities.push(activity.title);
                  existing.activityCount += 1;
                }
              } else {
                // Create new entry with default values
                materialMap.set(normalizedName, {
                  name: materialName,
                  normalizedName: normalizedName,
                  category: 'Uncategorized',
                  description: '',
                  quantity: 1,
                  unit: 'piece',
                  isReusable: false,
                  isOptional: false,
                  activities: [activity.title],
                  activityCount: 1,
                  owned: false,
                  materialType: 'basic',
                  householdAlternative: ''
                });
              }
            }
          }
        }
        
        // Convert map to array and sort by activity count
        const materialsList = Array.from(materialMap.values()).sort((a, b) => b.activityCount - a.activityCount);
        console.log(`Found ${materialsList.length} materials needed for activities`);
        
        setMaterials(materialsList);
      } catch (error) {
        console.error('Error fetching materials forecast:', error);
        setError('Failed to load materials forecast');
      } finally {
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
          <h3 className="font-medium text-gray-900">Materials Forecast</h3>
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
                Start with household items you already have, then gradually add specialized materials as needed.
              </p>
              
              {/* Household Items Section */}
              {materials.filter(m => m.materialType === 'household').length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-emerald-600 mb-2">
                    Household Items
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    These are common items you likely already have at home.
                  </p>
                  <ul className="space-y-2 divide-y divide-gray-100">
                    {materials
                      .filter(m => m.materialType === 'household')
                      .map((material, index) => (
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
                              <span className="text-gray-800 font-medium">
                                {material.name}
                                {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{material.category}</span>
                                <span className="text-xs text-gray-500">
                                  Used in {material.activityCount} {material.activityCount === 1 ? 'activity' : 'activities'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {material.owned ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                              <Check className="h-3 w-3 mr-1" />
                              In your inventory
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                              Common household item
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              
              {/* Basic Materials Section */}
              {materials.filter(m => m.materialType === 'basic').length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-blue-600 mb-2">
                    Basic Montessori Materials
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    These are the core materials that will help you get started with Montessori activities.
                  </p>
                  <ul className="space-y-2 divide-y divide-gray-100">
                    {materials
                      .filter(m => m.materialType === 'basic')
                      .map((material, index) => (
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
                              <span className="text-gray-800 font-medium">
                                {material.name}
                                {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                              </span>
                              {material.householdAlternative && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Alternative: {material.householdAlternative}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{material.category}</span>
                                <span className="text-xs text-gray-500">
                                  Used in {material.activityCount} {material.activityCount === 1 ? 'activity' : 'activities'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {material.owned ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                              <Check className="h-3 w-3 mr-1" />
                              In your inventory
                            </span>
                          ) : (
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
              
              {/* Advanced Materials Section */}
              {materials.filter(m => m.materialType === 'advanced').length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-purple-600 mb-2">
                    Advanced Materials
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    These are specialized materials that can be added as your child progresses.
                  </p>
                  <ul className="space-y-2 divide-y divide-gray-100">
                    {materials
                      .filter(m => m.materialType === 'advanced')
                      .map((material, index) => (
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
                              <span className="text-gray-800 font-medium">
                                {material.name}
                                {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{material.category}</span>
                                <span className="text-xs text-gray-500">
                                  Used in {material.activityCount} {material.activityCount === 1 ? 'activity' : 'activities'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {material.owned ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                              <Check className="h-3 w-3 mr-1" />
                              In your inventory
                            </span>
                          ) : (
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
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No activities available with your current materials.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No materials needed for the selected period.
            </p>
          )}
        </div>
      )}
    </div>
  );
}