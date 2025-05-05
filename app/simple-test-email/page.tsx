'use client';

import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SimpleTestEmailPage() {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const sendTestEmail = async () => {
    try {
      setIsSending(true);
      setMessage('');
      setError('');
      
      // Build the URL with email if provided
      let url = '/api/simple-test-email';
      if (email) {
        url += `?email=${encodeURIComponent(email)}`;
      }
      
      const response = await fetch(url);
      
      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${response.status}). Please check server logs.`);
      }
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Test email sent successfully! Check your inbox.');
      } else {
        setError(data.error || 'Failed to send email. Please try again.');
      }
    } catch (error: any) {
      setError(error.message || 'Network error. Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Simple Test Email</h1>
          <p className="mb-4 text-gray-600">
            This page tests email sending without any Firebase dependencies. Use this if you're having issues with the regular test email page.
          </p>
          
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional - defaults to amberwinter824@gmail.com)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="block w-full rounded-md border-gray-300 shadow-sm py-2 px-3 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
          
          <button
            onClick={sendTestEmail}
            disabled={isSending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Sending...
              </>
            ) : (
              'Send Simple Test Email'
            )}
          </button>
          
          {message && (
            <div className="mt-4 p-4 rounded-md bg-green-50 text-green-700">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 rounded-md bg-red-50 text-red-700 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Other email test options</h2>
            <div className="space-y-2">
              <Link 
                href="/test-email"
                className="inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full"
              >
                Standard Test Email
              </Link>
              <Link 
                href="/test-emails"
                className="inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full"
              >
                Test Weekly Plan Emails
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 