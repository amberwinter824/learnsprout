'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestEmailPage() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [childId, setChildId] = useState('');
  const [safeMode, setSafeMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setResponse(null);
    setError(null);
    
    try {
      // Auto-fill email with current user if not specified
      const emailToUse = email || (currentUser?.email || '');
      
      if (!emailToUse) {
        throw new Error('Email is required');
      }
      
      // Build the URL - use safe endpoint if safe mode is enabled
      let url = safeMode 
        ? `/api/test-weekly-email-safe?email=${encodeURIComponent(emailToUse)}`
        : `/api/test-weekly-email?email=${encodeURIComponent(emailToUse)}`;
      
      if (childId && !safeMode) {
        url += `&childId=${encodeURIComponent(childId)}`;
      }
      
      console.log('Sending request to:', url);
      
      // Make the request
      const result = await fetch(url);
      
      // Check if the response is JSON
      const contentType = result.headers.get('content-type');
      
      // For non-JSON responses, try to get the text content for better debugging
      if (!contentType || !contentType.includes('application/json')) {
        const textContent = await result.text();
        console.error('Non-JSON response received:', textContent.substring(0, 500));
        throw new Error(`Server returned non-JSON response (${result.status}): ${textContent.substring(0, 100)}...`);
      }
      
      let data;
      try {
        const responseText = await result.clone().text(); // Clone to not consume the body
        console.log('Response text:', responseText);
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        const rawText = await result.text();
        throw new Error(`Failed to parse JSON response: ${rawText.substring(0, 100)}...`);
      }
      
      if (!result.ok) {
        throw new Error(data.error || `Server error (${result.status}): Failed to send test email`);
      }
      
      console.log('Received response:', data);
      setResponse(data);
    } catch (err: any) {
      console.error('Email test error:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Weekly Plan Emails</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email (leave empty to use current user's email)
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={currentUser?.email || "Enter email address"}
            className="block w-full rounded-md border-gray-300 shadow-sm py-2 px-3 focus:border-emerald-500 focus:ring-emerald-500"
          />
        </div>
        
        {!safeMode && (
          <div>
            <label htmlFor="childId" className="block text-sm font-medium text-gray-700 mb-1">
              Child ID (optional - leave empty to send for all children)
            </label>
            <input
              type="text"
              id="childId"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              placeholder="Optional: Specify a child ID"
              className="block w-full rounded-md border-gray-300 shadow-sm py-2 px-3 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="safeMode"
              checked={safeMode}
              onChange={(e) => setSafeMode(e.target.checked)}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label htmlFor="safeMode" className="ml-2 block text-sm text-gray-700">
              Use safe mode (no Firebase)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="debugMode"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
              className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <label htmlFor="debugMode" className="ml-2 block text-sm text-gray-700">
              Show debug info
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Test Email'}
        </button>
      </form>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {response && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <p className="text-sm text-green-700 mt-1">{response.message}</p>
            </div>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">Results:</h4>
            <ul className="bg-white rounded-md p-3 divide-y divide-gray-200">
              {response.results && response.results.map((result: any, index: number) => (
                <li key={index} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{result.childName}</span>
                    {result.success ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Failed
                      </span>
                    )}
                  </div>
                  {!result.success && (
                    <p className="mt-1 text-xs text-red-600">{result.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {showDebug && response && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Debug Information</h3>
          <div className="bg-gray-800 text-white p-4 rounded-md overflow-auto max-h-96">
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">How to test</h3>
        <p className="text-sm text-gray-600 mb-2">
          This page sends a test weekly plan email to the specified email address. You can leave the email 
          field empty to use your current logged-in user's email.
        </p>
        <p className="text-sm text-gray-600 mb-2">
          If you specify a Child ID, only that child's weekly plan will be sent. Otherwise, weekly plans for all 
          active children associated with the user will be sent.
        </p>
        <p className="text-sm text-gray-600 mb-2">
          If a weekly plan doesn't exist for the next week, a test plan will be generated with dummy activities.
        </p>
        <p className="text-sm text-gray-600 font-medium mb-4">
          If you&apos;re having issues with Firebase configuration, enable &quot;Safe Mode&quot; which skips all Firebase database interactions.
        </p>
        
        <div className="mt-2">
          <a 
            href="/check-env"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Check environment variables status
          </a>
        </div>
      </div>
    </div>
  );
} 