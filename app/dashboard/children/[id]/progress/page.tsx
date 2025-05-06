"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProgressRedirectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const childId = params.id;
  
  useEffect(() => {
    // Redirect to development page for this child
    router.replace(`/dashboard/children/${childId}/development`);
  }, [router, childId]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-4" />
      <p className="text-gray-500">Redirecting to Development page...</p>
    </div>
  );
}