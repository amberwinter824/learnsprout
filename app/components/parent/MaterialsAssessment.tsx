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
  Timestamp 
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
}

interface Activity {
  id: string;
  title: string;
  minAge: number;
  maxAge: number;
  materialsNeeded?: string[];
  category?: string;
}

interface MaterialsAssessmentProps {
  childId: string;
  childAge: number;
  childName?: string;
  onComplete?: () => void;
  isInitialSetup?: boolean;
}

export default function MaterialsAssessment({ 
  childId, 
  childAge,
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

  useEffect(() => {
    const fetchMaterials = async () => {
      if (!currentUser?.uid) return;
      
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

        // Get activities appropriate for child's age
        const activitiesQuery = query(
          collection(db, 'activities'),
          where('minAge', '<=', childAge),
          where('maxAge', '>=', childAge)
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activities = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];

        // Get all materials
        const materialsSnapshot = await getDocs(collection(db, 'materials'));
        const allMaterials = materialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[];

        // Filter materials based on activities
        const activityIds = new Set(activities.map(a => a.id));
        const relevantMaterials = allMaterials.filter(material => 
          material.activities?.some(activityId => activityIds.has(activityId))
        );

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
  }, [childAge, currentUser]);

  const handleMaterialToggle = async (materialId: string) => {
    if (!currentUser?.uid) return;

    try {
      const userMaterialRef = doc(db, 'userMaterials', `${currentUser.uid}_${materialId}`);
      const newSelected = new Set(selectedMaterials);
      
      if (newSelected.has(materialId)) {
        newSelected.delete(materialId);
        await setDoc(userMaterialRef, { isOwned: false });
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
            ? `Let's get you set up with the materials needed for your ${childAge} year old's activities.`
            : `Materials needed for ${childName || 'your child'}'s activities (${childAge} years old).`
          }
          Check off what you already have at home.
        </p>
      </div>

      <div className="p-6">
        {Object.entries(categories).map(([category, categoryMaterials]) => (
          <div key={category} className="mb-8 last:mb-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
            <div className="space-y-4">
              {categoryMaterials.map((material) => (
                <div 
                  key={material.id}
                  className={`p-4 rounded-lg border ${
                    selectedMaterials.has(material.id)
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-gray-200 hover:border-emerald-200'
                  } transition-colors duration-200`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <button
                          onClick={() => handleMaterialToggle(material.id)}
                          className="group flex items-center"
                        >
                          {selectedMaterials.has(material.id) ? (
                            <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 mr-2" />
                          )}
                          <span className="font-medium text-gray-900">
                            {material.name}
                            {material.quantity > 1 && ` (${material.quantity} ${material.unit}s)`}
                            {material.isOptional && <span className="ml-2 text-sm text-gray-500">(Optional)</span>}
                          </span>
                        </button>
                      </div>
                      {material.description && (
                        <p className="mt-1 text-sm text-gray-600 ml-7">
                          {material.description}
                        </p>
                      )}
                      {material.isReusable && (
                        <span className="ml-7 inline-flex items-center px-2 py-0.5 mt-2 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Reusable
                        </span>
                      )}
                    </div>
                    {(material.amazonLink || material.affiliateLink) && (
                      <a
                        href={material.affiliateLink || material.amazonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
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

        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={createAmazonCart}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Create Amazon Cart for Missing Items
          </button>
          {onComplete && (
            <button
              onClick={onComplete}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Save and Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 