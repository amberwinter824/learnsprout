'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShoppingBag, Package, ArrowRight, X, Info } from 'lucide-react';
import { getEssentialStarterKit } from '@/lib/materialsData';
import { Material } from '@/lib/types';

export default function StarterKitPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [ownedMaterials, setOwnedMaterials] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Get essential materials
        const essentialMaterials = await getEssentialStarterKit();
        setMaterials(essentialMaterials);
        
        // Get user's owned materials
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const owned = userDoc.data().ownedMaterials || [];
          setOwnedMaterials(new Set(owned));
        }
        
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMaterials();
  }, [currentUser]);
  
  const handleToggleOwned = async (materialId: string) => {
    if (!currentUser) return;
    
    try {
      const newOwnedMaterials = new Set(ownedMaterials);
      if (newOwnedMaterials.has(materialId)) {
        newOwnedMaterials.delete(materialId);
      } else {
        newOwnedMaterials.add(materialId);
      }
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ownedMaterials: Array.from(newOwnedMaterials),
        updatedAt: new Date()
      });
      
      setOwnedMaterials(newOwnedMaterials);
    } catch (error) {
      console.error('Error updating owned materials:', error);
    }
  };
  
  const handleAddAllToCart = () => {
    const unownedMaterials = materials.filter(m => !ownedMaterials.has(m.id));
    const amazonLinks = unownedMaterials.map(m => m.amazonLink);
    
    // Open each Amazon link in a new tab
    amazonLinks.forEach(link => {
      window.open(link, '_blank');
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Montessori Starter Kit</h1>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Essential Materials</h2>
          <p className="mt-1 text-sm text-gray-500">
            These are the core Montessori materials that will help you get started with your child's learning journey.
          </p>
        </div>
        
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {materials.map((material) => (
              <li key={material.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">{material.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{material.description}</p>
                    {material.householdAlternative && (
                      <p className="mt-2 text-sm text-gray-500">
                        <span className="font-medium">Household Alternative:</span> {material.householdAlternative}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleToggleOwned(material.id)}
                      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${
                        ownedMaterials.has(material.id)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ownedMaterials.has(material.id) ? 'Owned' : 'Mark as Owned'}
                    </button>
                    
                    <a
                      href={material.amazonLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      View on Amazon
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <button
            onClick={handleAddAllToCart}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Add All Unowned to Amazon Cart
          </button>
        </div>
      </div>
    </div>
  );
} 