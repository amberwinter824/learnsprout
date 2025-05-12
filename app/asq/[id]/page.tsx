'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default function ASQFormPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pdfUrl = `/asq/ASQ-3-${params.id}-Mo-Set-B.pdf`;

  const handleOpenPdf = () => {
    window.open(pdfUrl, '_blank');
  };

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
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ASQ-3 {params.id} Month Questionnaire</h1>
          <p className="text-gray-600 mb-6">
            Click the button below to open the ASQ questionnaire in a new window. This will allow you to view and complete the form.
          </p>
          
          <button
            onClick={handleOpenPdf}
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            Open ASQ Questionnaire
          </button>
        </div>
      </div>
    </div>
  );
} 