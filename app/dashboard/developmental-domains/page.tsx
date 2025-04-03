'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DevelopmentalDomainsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const backTo = searchParams.get('backTo') || '/dashboard/progress';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href={backTo}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Understanding Developmental Domains</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-3">Practical Life</h3>
              <p className="text-sm text-blue-700">
                Focuses on self-care, independence, and fine motor coordination. These skills help children develop confidence and independence in daily activities.
              </p>
            </div>
            <div className="p-6 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-3">Sensorial</h3>
              <p className="text-sm text-purple-700">
                Enhances the refinement of senses and perception. Children learn to classify, sort, and understand their environment through sensory experiences.
              </p>
            </div>
            <div className="p-6 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-3">Language</h3>
              <p className="text-sm text-green-700">
                Develops communication, vocabulary, and literacy skills. This foundation supports reading, writing, and effective communication.
              </p>
            </div>
            <div className="p-6 bg-red-50 rounded-lg">
              <h3 className="font-medium text-red-800 mb-3">Mathematics</h3>
              <p className="text-sm text-red-700">
                Builds understanding of numbers, quantities, and mathematical concepts through concrete materials and hands-on experiences.
              </p>
            </div>
            <div className="p-6 bg-amber-50 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-3">Cultural</h3>
              <p className="text-sm text-amber-700">
                Explores geography, science, art, and music. This broadens children's understanding of the world and different cultures.
              </p>
            </div>
            <div className="p-6 bg-pink-50 rounded-lg">
              <h3 className="font-medium text-pink-800 mb-3">Social & Emotional</h3>
              <p className="text-sm text-pink-700">
                Develops self-awareness, emotional regulation, and social skills. These skills are crucial for building relationships and understanding oneself.
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Skill Progression Stages</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-amber-50 rounded-lg">
                <h3 className="font-medium text-amber-800 mb-2">Emerging</h3>
                <p className="text-sm text-amber-700">
                  Child is beginning to show interest and initial attempts at the skill. They may need significant support and guidance.
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Developing</h3>
                <p className="text-sm text-blue-700">
                  Child shows growing competence with some support. They can perform the skill with occasional assistance.
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Mastered</h3>
                <p className="text-sm text-green-700">
                  Child consistently demonstrates the skill independently. They can perform the skill reliably without assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 