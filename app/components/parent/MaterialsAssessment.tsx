"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  doc, 
  getDoc,
  setDoc,
  Timestamp,
  or,
  updateDoc
} from 'firebase/firestore';
import { 
  Package, 
  ExternalLink, 
  Loader2, 
  CheckCircle, 
  XCircle,
  ShoppingCart,
  CalendarRange
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAge } from '@/lib/ageUtils';

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
  materialType: string;
  owned: boolean;
  householdAlternative?: string;
}

interface Activity {
  id: string;
  title: string;
  ageRange: number[];
  materialsNeeded?: string[];
  category?: string;
}

interface MaterialsAssessmentProps {
  childId: string;
  childName?: string;
  onComplete?: () => void;
  isInitialSetup?: boolean;
}

export default function MaterialsAssessment({ 
  childId, 
  childName,
  onComplete,
  isInitialSetup = false
}: MaterialsAssessmentProps) {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Record<string, Material[]>>({});
  const [period, setPeriod] = useState<'90' | '180' | '365'>('90');
  const [childAgeGroup, setChildAgeGroup] = useState<string>('');
  const [updatingMaterial, setUpdatingMaterial] = useState<string | null>(null);

  useEffect(() => {
    const fetchChildAgeGroup = async () => {
      if (!childId) return;
      
      try {
        const childDoc = await getDoc(doc(db, 'children', childId));
        if (childDoc.exists()) {
          const childData = childDoc.data();
          setChildAgeGroup(childData.ageGroup || '');
        }
      } catch (error) {
        console.error('Error fetching child age group:', error);
      }
    };

    fetchChildAgeGroup();
  }, [childId]);

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!currentUser?.uid || !childAgeGroup) return;
      
      try {
        setLoading(true);
        setError(null);

        // Get user's existing materials
        const userMaterialsQuery = query(
          collection(db, 'userMaterials'),
          where('userId', '==', currentUser.uid),
          where('isOwned', '==', true)
        );
        const userMaterialsSnapshot = await getDocs(userMaterialsQuery);
        const ownedMaterialIds = new Set(userMaterialsSnapshot.docs.map(doc => doc.data().materialId));
        setSelectedMaterials(ownedMaterialIds);

        // Get activities appropriate for child's age group
        const activitiesQuery = query(
          collection(db, 'activities'),
          where('ageRanges', 'array-contains', childAgeGroup)
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activities = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];

        console.log(`Found ${activities.length} activities for age group ${childAgeGroup}`);
        console.log('Processing activities and their materials:');

        // Get all materials
        const materialsSnapshot = await getDocs(collection(db, 'materials'));
        const allMaterials = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[];

        console.log(`Found ${allMaterials.length} materials in database`);

        // Create a map of normalized names to materials for easier lookup
        const materialsByNormalizedName = new Map<string, Material>();
        allMaterials.forEach(material => {
          // Add the main normalized name
          materialsByNormalizedName.set(material.normalizedName, material);
          // Also add the regular name normalized in the same way
          materialsByNormalizedName.set(material.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), material);
          // Also add alternative names if they exist
          material.alternativeNames?.forEach(altName => {
            materialsByNormalizedName.set(altName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), material);
          });
        });

        // Get unique materials needed from all activities
        const neededMaterialNames = new Set<string>();
        activities.forEach(activity => {
          console.log(`Processing activity: ${activity.title}`);
          activity.materialsNeeded?.forEach(materialName => {
            // Normalize the material name in the same way
            const normalizedName = materialName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            neededMaterialNames.add(normalizedName);
            console.log(`  Material needed: ${materialName} (normalized: ${normalizedName})`);
          });
        });

        console.log('All normalized material names in database:', Array.from(materialsByNormalizedName.keys()));
        console.log('Needed normalized material names:', Array.from(neededMaterialNames));

        // Find relevant materials
        const relevantMaterials = Array.from(neededMaterialNames)
          .map(materialName => {
            const material = materialsByNormalizedName.get(materialName);
            if (!material) {
              console.log(`No match found for material: ${materialName}`);
            }
            return material;
          })
          .filter((material): material is Material => material !== undefined);

        console.log('Materials count after processing:', relevantMaterials.length);
        console.log('Relevant materials:', relevantMaterials.map(m => m.name));

        // Group materials by category
        const groupedMaterials = relevantMaterials.reduce((acc, material) => {
          const category = material.category || 'Other';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(material);
          return acc;
        }, {} as Record<string, Material[]>);

        setMaterials(relevantMaterials);
        setCategories(groupedMaterials);
      } catch (err) {
        console.error('Error fetching materials:', err);
        setError('Failed to load materials');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [childAgeGroup, currentUser]);

  const handleToggleOwned = async (materialId: string, owned: boolean) => {
    if (!currentUser?.uid) return;

    try {
      setUpdatingMaterial(materialId);
      const userMaterialRef = doc(db, 'userMaterials', `${currentUser.uid}_${materialId}`);
      const newSelected = new Set(selectedMaterials);
      
      if (owned) {
        newSelected.delete(materialId);
        await updateDoc(userMaterialRef, { isOwned: false });
      } else {
        newSelected.add(materialId);
        await setDoc(userMaterialRef, {
          userId: currentUser.uid,
          materialId: materialId,
          isOwned: true,
          addedAt: Timestamp.now()
        });
      }
      
      setSelectedMaterials(newSelected);
    } catch (err) {
      console.error('Error updating material status:', err);
      setError('Failed to update material status');
    } finally {
      setUpdatingMaterial(null);
    }
  };

  const createAmazonCart = () => {
    const neededMaterials = materials.filter(m => 
      !selectedMaterials.has(m.id) && m.amazonLink
    );
    
    if (neededMaterials.length === 0) return;
    
    // Construct Amazon cart URL
    const cartUrl = `https://www.amazon.com/gp/aws/cart/add.html?${
      neededMaterials
        .map((m, i) => {
          const asin = m.amazonLink?.match(/\/dp\/([A-Z0-9]{10})/)?.[1];
          return asin ? `ASIN.${i+1}=${asin}&Quantity.${i+1}=1` : null;
        })
        .filter(Boolean)
        .join('&')
    }`;
    
    window.open(cartUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-5 w-5 text-emerald-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isInitialSetup ? 'Initial Materials Assessment' : 'Materials Assessment'}
            </h2>
          </div>
          {!isInitialSetup && (
            <div className="flex items-center space-x-2">
              <CalendarRange className="h-4 w-4 text-gray-500" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as '90' | '180' | '365')}
                className="text-sm border-gray-300 rounded-md focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="90">Next 90 days</option>
                <option value="180">Next 6 months</option>
                <option value="365">Next year</option>
              </select>
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {isInitialSetup 
            ? `Let's start with what you already have at home. You can gradually add specialized materials as needed.`
            : `Review your materials for ${childName || 'your child'}'s activities. Start with household items, then add specialized materials as needed.`
          }
          {childAgeGroup && ` (Ages ${childAgeGroup})`}
        </p>
      </div>

      <div className="p-6">
        {/* Household Items Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-emerald-600 mb-4">Household Items</h3>
          <p className="text-sm text-gray-600 mb-4">
            These are common items you likely already have at home. Check off what you have available.
          </p>
          <div className="space-y-4">
            {Object.entries(categories)
              .filter(([_, materials]) => materials.some(m => m.materialType === 'household'))
              .map(([category, categoryMaterials]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">{category}</h4>
                  <div className="space-y-3">
                    {categoryMaterials
                      .filter(m => m.materialType === 'household')
                      .map((material) => (
                        <div key={material.id} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              id={`material-${material.id}`}
                              checked={material.owned}
                              onChange={() => handleToggleOwned(material.id, material.owned)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                              disabled={updatingMaterial === material.id}
                            />
                          </div>
                          <div className="ml-3">
                            <label htmlFor={`material-${material.id}`} className="text-sm font-medium text-gray-700">
                              {material.name}
                              {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                            </label>
                            {material.description && (
                              <p className="mt-1 text-sm text-gray-600">
                                {material.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Basic Materials Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-blue-600 mb-4">Basic Montessori Materials</h3>
          <p className="text-sm text-gray-600 mb-4">
            These are the core materials that will help you get started with Montessori activities.
            Many have household alternatives you can use while you build your collection.
          </p>
          <div className="space-y-4">
            {Object.entries(categories)
              .filter(([_, materials]) => materials.some(m => m.materialType === 'basic'))
              .map(([category, categoryMaterials]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">{category}</h4>
                  <div className="space-y-3">
                    {categoryMaterials
                      .filter(m => m.materialType === 'basic')
                      .map((material) => (
                        <div key={material.id} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              id={`material-${material.id}`}
                              checked={material.owned}
                              onChange={() => handleToggleOwned(material.id, material.owned)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                              disabled={updatingMaterial === material.id}
                            />
                          </div>
                          <div className="ml-3">
                            <label htmlFor={`material-${material.id}`} className="text-sm font-medium text-gray-700">
                              {material.name}
                              {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                            </label>
                            {material.householdAlternative && (
                              <p className="mt-1 text-sm text-gray-500">
                                Alternative: {material.householdAlternative}
                              </p>
                            )}
                            {material.description && (
                              <p className="mt-1 text-sm text-gray-600">
                                {material.description}
                              </p>
                            )}
                            {(material.amazonLink || material.affiliateLink) && (
                              <a
                                href={material.affiliateLink || material.amazonLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Buy on Amazon
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Advanced Materials Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-purple-600 mb-4">Advanced Materials</h3>
          <p className="text-sm text-gray-600 mb-4">
            These are specialized materials that can be added as your child progresses.
            Focus on the basic materials first.
          </p>
          <div className="space-y-4">
            {Object.entries(categories)
              .filter(([_, materials]) => materials.some(m => m.materialType === 'advanced'))
              .map(([category, categoryMaterials]) => (
                <div key={category} className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">{category}</h4>
                  <div className="space-y-3">
                    {categoryMaterials
                      .filter(m => m.materialType === 'advanced')
                      .map((material) => (
                        <div key={material.id} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              id={`material-${material.id}`}
                              checked={material.owned}
                              onChange={() => handleToggleOwned(material.id, material.owned)}
                              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                              disabled={updatingMaterial === material.id}
                            />
                          </div>
                          <div className="ml-3">
                            <label htmlFor={`material-${material.id}`} className="text-sm font-medium text-gray-700">
                              {material.name}
                              {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                            </label>
                            {material.description && (
                              <p className="mt-1 text-sm text-gray-600">
                                {material.description}
                              </p>
                            )}
                            {(material.amazonLink || material.affiliateLink) && (
                              <a
                                href={material.affiliateLink || material.amazonLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Buy on Amazon
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {onComplete && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={onComplete}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 