'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Package, ArrowLeft, Info, Calendar, Hammer } from 'lucide-react';
import Link from 'next/link';
import { commonHouseholdItems, essentialStarterKit } from '@/lib/materialsData';

export default function HouseholdItemsPage() {
  const { currentUser } = useAuth();

  // Mark that user has viewed household materials
  React.useEffect(() => {
    const markHouseholdMaterialsViewed = async () => {
      if (!currentUser) return;
      
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          'preferences.hasViewedHouseholdMaterials': true,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Error marking household materials as viewed:', error);
      }
    };
    
    markHouseholdMaterialsViewed();
  }, [currentUser]);

  // Group household items by category
  const categorizedItems = {
    'Kitchen Items': commonHouseholdItems.filter(item => 
      ['spoon', 'fork', 'knife', 'plate', 'bowl', 'cup', 'mug', 'napkin', 'paper towel', 
       'towel', 'dish soap', 'sponge', 'container', 'basket', 'tray', 'measuring cup', 
       'measuring spoon'].includes(item)
    ),
    'Art Supplies': commonHouseholdItems.filter(item => 
      ['paper', 'pencil', 'pen', 'marker', 'crayon', 'scissors', 'glue', 'tape', 'paint', 
       'brush', 'coloring book', 'construction paper', 'cardboard', 'box', 'string', 
       'yarn', 'ribbon'].includes(item)
    ),
    'Household Items': commonHouseholdItems.filter(item => 
      ['basket', 'container', 'box', 'bag', 'bottle', 'jar', 'lid', 'cloth', 'fabric', 
       'tissue', 'cotton ball', 'cotton swab', 'sponge', 'brush', 'broom', 'dustpan', 
       'mop', 'rag'].includes(item)
    ),
    'Natural Items': commonHouseholdItems.filter(item => 
      ['water', 'sand', 'dirt', 'soil', 'rock', 'stone', 'leaf', 'stick', 'shell', 
       'seed', 'flower', 'grass', 'pinecone', 'acorn', 'feather'].includes(item)
    ),
    'Food Items': commonHouseholdItems.filter(item => 
      ['rice', 'bean', 'pasta', 'cereal', 'flour', 'salt', 'sugar', 'spice', 'herb', 
       'fruit', 'vegetable', 'grain', 'seed', 'nut', 'raisin', 'cracker', 'cookie', 
       'bread'].includes(item)
    ),
    'Tools & Educational Items': commonHouseholdItems.filter(item => 
      ['book', 'paper', 'pencil', 'pen', 'marker', 'crayon', 'chalk', 'board', 'card', 
       'block', 'bead', 'button', 'coin', 'key', 'lock', 'magnet', 'mirror', 
       'magnifying glass', 'hammer', 'screwdriver', 'pliers', 'scissors', 'knife', 
       'spoon', 'fork', 'tongs', 'clamp'].includes(item)
    )
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Household Items Guide</h1>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-8">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-emerald-500 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h2 className="text-emerald-800 font-medium">Start with what you have</h2>
            <p className="mt-1 text-sm text-emerald-700">
              You don't need special Montessori materials to get started! Many activities can be done 
              with common household items you already have. This guide shows you what items you can 
              use and how to adapt them for Montessori learning.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(categorizedItems).map(([category, items]) => (
          <div key={category} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{category}</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-center">
                    <Package className="h-4 w-4 text-emerald-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-700 capitalize">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start">
          <Hammer className="h-5 w-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Montessori Materials You Can Make</h2>
            <p className="text-gray-700 mb-4">
              Here are some Montessori materials you can make at home using common items:
            </p>
            <div className="space-y-4">
              {essentialStarterKit.map((material) => (
                <div key={material.id} className="bg-emerald-50 rounded-lg p-4">
                  <h3 className="font-medium text-emerald-800">{material.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                  <div className="mt-2 flex items-start">
                    <Hammer className="h-4 w-4 text-emerald-500 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Make it with:</span> {material.householdAlternative}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tips for Using Household Items</h2>
        <ul className="space-y-4">
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <Package className="h-5 w-5 text-emerald-500 mt-0.5" />
            </div>
            <div className="ml-3">
              <p className="text-gray-700">
                <span className="font-medium">Choose child-sized items</span> - Select items that are 
                appropriately sized for your child's hands and strength.
              </p>
            </div>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <Package className="h-5 w-5 text-emerald-500 mt-0.5" />
            </div>
            <div className="ml-3">
              <p className="text-gray-700">
                <span className="font-medium">Keep it simple</span> - Start with basic items and 
                gradually introduce more complex materials as your child develops.
              </p>
            </div>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <Package className="h-5 w-5 text-emerald-500 mt-0.5" />
            </div>
            <div className="ml-3">
              <p className="text-gray-700">
                <span className="font-medium">Focus on one skill at a time</span> - Use items that 
                isolate specific skills or concepts to help your child focus.
              </p>
            </div>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0">
              <Package className="h-5 w-5 text-emerald-500 mt-0.5" />
            </div>
            <div className="ml-3">
              <p className="text-gray-700">
                <span className="font-medium">Make it beautiful</span> - Even simple items can be 
                presented in an attractive way to engage your child's interest.
              </p>
            </div>
          </li>
        </ul>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start">
          <Calendar className="h-5 w-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Next Steps</h2>
            <p className="text-gray-700 mb-4">
              Now that you know what household items you can use, head back to your dashboard to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Set your preferred schedule for activities</li>
              <li>Generate your first weekly plan</li>
              <li>Start tracking your child's progress</li>
            </ul>
            <div className="mt-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 