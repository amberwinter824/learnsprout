'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function TestEmailPage() {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  const sendTestEmail = async () => {
    try {
      setIsSending(true);
      setMessage('');
      
      const response = await fetch('/api/test-email', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Test email sent successfully! Check your inbox.');
      } else {
        setMessage(`Error: ${data.error?.message || 'Failed to send email'}`);
      }
    } catch (error) {
      setMessage('Error sending test email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Email Service</h1>
          
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
              'Send Test Email'
            )}
          </button>
          
          {message && (
            <div className={`mt-4 p-4 rounded-md ${
              message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 