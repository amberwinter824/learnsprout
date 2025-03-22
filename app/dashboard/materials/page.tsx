'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Loader2, Package, Plus, Search, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface Material {
  id: string;
  name: string;
  normalizedName: string;
  category?: string;
  description?: string;
  amazonLink?: string;
  affiliateLink?: string;
  isOwned: boolean;
}

export default function MaterialsInventory() {
  const { currentUser } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'owned' | 'needed'>('all');

  useEffect(() => {
    if (!currentUser?.uid) return;

    async function fetchMaterials() {
      try {
        setLoading(true);
        setError(null);

        if (!currentUser?.uid) {
          setError('User not authenticated');
          return;
        }

        // Get all materials
        const materialsRef = collection(db, 'materials');
        const materialsSnapshot = await getDocs(materialsRef);
        
        // Get user's owned materials
        const userMaterialsRef = collection(db, 'userMaterials');
        const userMaterialsQuery = query(userMaterialsRef, where('userId', '==', currentUser.uid));
        const userMaterialsSnapshot = await getDocs(userMaterialsQuery);
        
        const ownedMaterialIds = new Set(userMaterialsSnapshot.docs.map(doc => doc.data().materialId));
        
        // Combine materials with ownership status
        const materialsList = materialsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            normalizedName: data.normalizedName,
            category: data.category,
            description: data.description,
            amazonLink: data.amazonLink,
            affiliateLink: data.affiliateLink,
            isOwned: ownedMaterialIds.has(doc.id)
          };
        });

        setMaterials(materialsList);
      } catch (error) {
        console.error('Error fetching materials:', error);
        setError('Failed to load materials');
      } finally {
        setLoading(false);
      }
    }

    fetchMaterials();
  }, [currentUser]);

  const toggleMaterialOwnership = async (materialId: string, currentStatus: boolean) => {
    if (!currentUser) return;

    try {
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
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'owned' && material.isOwned) ||
      (filter === 'needed' && !material.isOwned);
    
    return matchesSearch && matchesFilter;
  });

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Materials Inventory</h1>
        <p className="mt-2 text-gray-600">
          Manage your materials and track what you have available for activities.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Materials
          </button>
          <button
            onClick={() => setFilter('owned')}
            className={`px-4 py-2 rounded-md ${
              filter === 'owned'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Owned
          </button>
          <button
            onClick={() => setFilter('needed')}
            className={`px-4 py-2 rounded-md ${
              filter === 'needed'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Needed
          </button>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map(material => (
          <div
            key={material.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{material.name}</h3>
                {material.category && (
                  <p className="text-sm text-gray-500 mt-1">{material.category}</p>
                )}
                {material.description && (
                  <p className="text-sm text-gray-600 mt-2">{material.description}</p>
                )}
                {(material.amazonLink || material.affiliateLink) && (
                  <div className="mt-2">
                    {material.affiliateLink && (
                      <a
                        href={material.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center mr-3 mb-1"
                      >
                        Buy (Affiliate Link)
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                    {material.amazonLink && !material.affiliateLink && (
                      <a
                        href={material.amazonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        Buy on Amazon
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => toggleMaterialOwnership(material.id, material.isOwned)}
                className={`p-2 rounded-full ${
                  material.isOwned
                    ? 'text-green-600 bg-green-50 hover:bg-green-100'
                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                }`}
                title={material.isOwned ? 'Mark as not owned' : 'Mark as owned'}
              >
                {material.isOwned ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
          <p className="text-gray-500">
            {searchTerm
              ? 'Try adjusting your search terms'
              : filter === 'owned'
              ? 'You haven\'t marked any materials as owned yet'
              : filter === 'needed'
              ? 'You have all the materials you need'
              : 'No materials available'}
          </p>
        </div>
      )}
    </div>
  );
} 