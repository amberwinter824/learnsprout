'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function ASQFormPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pdfUrl = `/asq/ASQ-3-${params.id}-Mo-Set-B.pdf`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-[calc(100vh-8rem)]"
            title="ASQ Form"
          />
        </div>
      </div>
    </div>
  );
} 