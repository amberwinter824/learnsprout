'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Loader2, Package, Plus, Search, CheckCircle, XCircle, ExternalLink, X } from 'lucide-react';
import MaterialsAssessment from '@/components/parent/MaterialsAssessment';

interface Material {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  isReusable: boolean;
  isOptional: boolean;
  amazonLink: string;
  affiliateLink: string;
  activities: string[];
  alternativeNames: string[];
  isOwned: boolean;
  materialType?: string;
  householdAlternative?: string;
  isNeededForUpcoming?: boolean;
}

interface Activity {
  id: string;
  title: string;
  materialsNeeded: string[];
  scheduledDate?: Date;
}

export default function MaterialsInventory() {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingMaterial, setUpdatingMaterial] = useState<string | null>(null);
  const [children, setChildren] = useState<{ id: string; name: string; age: number; ageGroup: string }[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['household']));
  const [isCompactView, setIsCompactView] = useState(false);
  const [showOnlyNeeded, setShowOnlyNeeded] = useState(false);

  const fetchUpcomingActivities = async () => {
    if (!currentUser?.uid) return;

    try {
      // Get all children
      const childrenQuery = query(
        collection(db, 'children'),
        where('userId', '==', currentUser.uid)
      );
      const childrenSnapshot = await getDocs(childrenQuery);
      const childrenIds = childrenSnapshot.docs.map(doc => doc.id);

      // Get upcoming activities for all children
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('childId', 'in', childrenIds),
        where('scheduledDate', '>=', new Date())
      );
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const activities = activitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];

      setUpcomingActivities(activities);
    } catch (error) {
      console.error('Error fetching upcoming activities:', error);
    }
  };

  const fetchMaterials = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      
      // Get all materials
      const materialsRef = collection(db, 'materials');
      const materialsSnapshot = await getDocs(materialsRef);
      const allMaterials = materialsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];

      // Get user's owned materials
      const userMaterialsRef = collection(db, 'userMaterials');
      const userMaterialsQuery = query(
        userMaterialsRef,
        where('userId', '==', currentUser.uid),
        where('isOwned', '==', true)
      );
      const userMaterialsSnapshot = await getDocs(userMaterialsQuery);
      const ownedMaterialIds = new Set(userMaterialsSnapshot.docs.map(doc => doc.data().materialId));

      // Get materials needed for upcoming activities
      const neededMaterialIds = new Set(
        upcomingActivities.flatMap(activity => activity.materialsNeeded)
      );

      // Combine materials with ownership and needed status
      const materialsWithStatus = allMaterials.map(material => ({
        ...material,
        isOwned: ownedMaterialIds.has(material.id) || false,
        isNeededForUpcoming: neededMaterialIds.has(material.id) && !ownedMaterialIds.has(material.id)
      }));
      
      setMaterials(materialsWithStatus);
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  // Fetch both materials and upcoming activities when the component mounts
  useEffect(() => {
    if (currentUser) {
      Promise.all([
        fetchUpcomingActivities(),
        fetchMaterials()
      ]).catch(error => {
        console.error('Error in initial data fetch:', error);
        setError('Failed to load data');
      });
    }
  }, [currentUser]);

  // Update materials when upcoming activities change
  useEffect(() => {
    if (materials.length > 0 && upcomingActivities.length > 0) {
      const neededMaterialIds = new Set(
        upcomingActivities.flatMap(activity => activity.materialsNeeded)
      );

      setMaterials(prevMaterials => 
        prevMaterials.map(material => ({
          ...material,
          isNeededForUpcoming: neededMaterialIds.has(material.id) && !material.isOwned
        }))
      );
    }
  }, [upcomingActivities]);

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser?.uid) return;

      try {
        const childrenQuery = query(
          collection(db, 'children'),
          where('userId', '==', currentUser.uid)
        );
        const childrenSnapshot = await getDocs(childrenQuery);
        const childrenData = childrenSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            age: data.age || 0,
            ageGroup: data.ageGroup || ''
          };
        });
        setChildren(childrenData);
      } catch (error) {
        console.error('Error fetching children:', error);
      }
    };

    fetchChildren();
  }, [currentUser]);

  const toggleMaterialOwnership = async (materialId: string, currentStatus: boolean) => {
    if (!currentUser) return;

    try {
      setUpdatingMaterial(materialId);
      const userMaterialRef = doc(db, 'userMaterials', `${currentUser.uid}_${materialId}`);
      
      if (currentStatus) {
        // Remove ownership
        await updateDoc(userMaterialRef, { isOwned: false });
      } else {
        // Add ownership
        await setDoc(userMaterialRef, {
          userId: currentUser.uid,
          materialId: materialId,
          isOwned: true,
          addedAt: new Date()
        });
      }

      // Update local state
      setMaterials(prevMaterials =>
        prevMaterials.map(material =>
          material.id === materialId
            ? { ...material, isOwned: !currentStatus }
            : material
        )
      );
    } catch (error) {
      console.error('Error updating material ownership:', error);
      setError('Failed to update material status');
    } finally {
      setUpdatingMaterial(null);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.alternativeNames?.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesNeeded = !showOnlyNeeded || material.isNeededForUpcoming;
    return matchesSearch && matchesNeeded;
  });

  const groupedMaterials = filteredMaterials.reduce((acc, material) => {
    const type = material.materialType || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(material);
    return acc;
  }, {} as Record<string, Material[]>);

  // Sort materials within each group
  Object.values(groupedMaterials).forEach(group => {
    group.sort((a, b) => {
      // Sort by needed status first
      if (a.isNeededForUpcoming && !b.isNeededForUpcoming) return -1;
      if (!a.isNeededForUpcoming && b.isNeededForUpcoming) return 1;
      // Then by ownership
      if (a.isOwned && !b.isOwned) return -1;
      if (!a.isOwned && b.isOwned) return 1;
      // Finally alphabetically
      return a.name.localeCompare(b.name);
    });
  });

  const materialTypeLabels: Record<string, string> = {
    'household': 'Common Household Items',
    'basic': 'Basic Montessori Materials',
    'advanced': 'Advanced Montessori Materials',
    'other': 'Other Materials'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Materials Inventory</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search materials..."
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isCompactView}
              onChange={(e) => setIsCompactView(e.target.checked)}
              className="rounded"
            />
            Compact view
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlyNeeded}
              onChange={(e) => setShowOnlyNeeded(e.target.checked)}
              className="rounded"
            />
            Show only needed
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMaterials).map(([type, materials]) => (
            <div key={type} className="border rounded-lg overflow-hidden">
              <button
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                onClick={() => toggleSection(type)}
              >
                <h2 className="text-xl font-semibold capitalize">
                  {type === 'household' ? 'Household Items' :
                   type === 'basic' ? 'Basic Montessori Materials' :
                   type === 'advanced' ? 'Advanced Montessori Materials' : 
                   'Other Materials'}
                  <span className="ml-2 text-gray-500">({materials.length})</span>
                </h2>
                <span className="transform transition-transform duration-200" style={{
                  transform: expandedSections.has(type) ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>▼</span>
              </button>
              
              {expandedSections.has(type) && (
                <div className="divide-y">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className={`p-4 ${isCompactView ? 'py-2' : ''} ${
                        material.isNeededForUpcoming ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {material.name}
                            {material.isNeededForUpcoming && (
                              <span className="ml-2 text-blue-600 text-sm">Needed for upcoming activity</span>
                            )}
                          </h3>
                          {!isCompactView && material.description && (
                            <p className="text-gray-600 mt-1">{material.description}</p>
                          )}
                          {!isCompactView && material.householdAlternative && material.householdAlternative !== "Used in various Montessori activities" && (
                            <p className="text-gray-600 mt-1">
                              Alternative: {material.householdAlternative}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {material.amazonLink && (
                            <a
                              href={material.amazonLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink size={20} />
                            </a>
                          )}
                          
                          <button
                            onClick={() => toggleMaterialOwnership(material.id, material.isOwned)}
                            disabled={!!updatingMaterial}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                              material.isOwned
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {updatingMaterial === material.id ? (
                              <Loader2 className="animate-spin" size={20} />
                            ) : material.isOwned ? (
                              <CheckCircle size={20} />
                            ) : (
                              <Plus size={20} />
                            )}
                            {!isCompactView && (material.isOwned ? 'Owned' : 'Add')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 