'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CheckEnvPage() {
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const checkEnv = async () => {
      try {
        setLoading(true);
        
        // Add timestamp to avoid caching
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/check-env?t=${timestamp}`);
        
        // Store raw text response for debugging
        const rawText = await response.text();
        setRawResponse(rawText);
        
        let jsonData;
        
        try {
          // Try parsing the response as JSON
          jsonData = JSON.parse(rawText);
        } catch (jsonError) {
          console.error('Failed to parse response as JSON:', jsonError);
          throw new Error(`Server returned invalid JSON: ${rawText.substring(0, 100)}...`);
        }
        
        if (!response.ok) {
          throw new Error(jsonData.error || `Server error: ${response.status}`);
        }
        
        setEnvStatus(jsonData);
      } catch (err: any) {
        console.error('Error checking environment:', err);
        setError(err.message || 'Failed to check environment variables');
      } finally {
        setLoading(false);
      }
    };
    
    checkEnv();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Environment Status Check</h1>
      
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Checking environment variables...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {envStatus && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">General</h2>
            </div>
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm font-medium text-gray-700">Environment</div>
                <div className="text-sm text-gray-900">{envStatus.environment}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Firebase</h2>
            </div>
            <div className="px-4 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm font-medium text-gray-700">Service Account Key</div>
                <div className="text-sm text-gray-900 flex items-center">
                  {envStatus.firebase.serviceAccountPresent ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Present ({envStatus.firebase.serviceAccountLength} chars)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Missing
                    </span>
                  )}
                </div>
                
                <div className="text-sm font-medium text-gray-700">Decoded Content Length</div>
                <div className="text-sm text-gray-900">
                  {envStatus.firebase.decodedLength > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {envStatus.firebase.decodedLength} chars
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Invalid or empty
                    </span>
                  )}
                </div>
                
                <div className="text-sm font-medium text-gray-700">Valid JSON</div>
                <div className="text-sm text-gray-900">
                  {envStatus.firebase.serviceAccountValid ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Invalid
                    </span>
                  )}
                </div>
                
                <div className="text-sm font-medium text-gray-700">Traditional Credentials</div>
                <div className="text-sm text-gray-900">
                  {envStatus.firebase.traditionalCredentialsPresent ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Not found
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Resend (Email)</h2>
            </div>
            <div className="px-4 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm font-medium text-gray-700">API Key</div>
                <div className="text-sm text-gray-900">
                  {envStatus.resend.apiKeyPresent ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Present ({envStatus.resend.apiKeyLength} chars)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Missing
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {envStatus.availableEnvKeys && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Available Environment Variables</h2>
              </div>
              <div className="px-4 py-5">
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {envStatus.availableEnvKeys.map((key: string) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">What to do with this information</h2>
            
            <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700">
              <h3 className="font-medium mb-2">Firebase Service Account</h3>
              <p>If the Firebase Service Account is missing or invalid:</p>
              <ol className="list-decimal ml-6 mt-2 space-y-1">
                <li>Go to Firebase Console → Project Settings → Service Accounts</li>
                <li>Click "Generate new private key" to download the JSON file</li>
                <li>Encode the entire JSON file content as Base64</li>
                <li>Add the Base64 string as FIREBASE_SERVICE_ACCOUNT_KEY in your .env.local file or environment variables</li>
              </ol>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700">
              <h3 className="font-medium mb-2">Resend API Key</h3>
              <p>If the Resend API Key is missing:</p>
              <ol className="list-decimal ml-6 mt-2 space-y-1">
                <li>Go to <a href="https://resend.com" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">Resend.com</a> and log in to your account</li>
                <li>Navigate to API Keys and create a new API key</li>
                <li>Add the API key as RESEND_API_KEY in your .env.local file or environment variables</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <Link 
                href="/simple-test-email"
                className="block text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Try Simple Email Test (No Firebase)
              </Link>
              <Link 
                href="/test-emails"
                className="block text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Test Weekly Emails with Safe Mode
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {!envStatus && !loading && rawResponse && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Raw API Response</h2>
          <div className="bg-gray-800 text-white p-4 rounded-md overflow-auto max-h-96">
            <pre className="text-xs">{rawResponse}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 