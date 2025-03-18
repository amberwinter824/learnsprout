"use client"
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Sprout } from 'lucide-react';
import { acceptFamilyInvitation, getInvitationByCode } from '@/lib/familyService';
import type { InvitationDetails } from '@/lib/familyService';
import { Timestamp } from 'firebase/firestore';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [familyName, setFamilyName] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get invite code and email from URL
  const inviteCode = searchParams.get('invite');
  const inviteEmail = searchParams.get('email');

  // Check invitation when component loads
  useEffect(() => {
    async function checkInvitation() {
      if (inviteCode) {
        try {
          const invitation = await getInvitationByCode(inviteCode);
          if (invitation) {
            // Check if invitation has expired
            const expiresAt = invitation.expiresAt instanceof Timestamp 
              ? invitation.expiresAt.toDate() 
              : new Date(invitation.expiresAt);
              
            if (expiresAt < new Date()) {
              setError('This invitation has expired.');
              return;
            }

            // Get family name
            const familyDoc = await getDoc(doc(db, 'families', invitation.familyId));
            if (familyDoc.exists()) {
              setFamilyName(familyDoc.data().name);
            }

            setIsInviteMode(true);
            setInviteDetails(invitation);
            setEmail(inviteEmail || invitation.recipientEmail || '');
          }
        } catch (error) {
          console.error('Error checking invitation:', error);
          setError('Invalid invitation link.');
        }
      }
    }
    
    checkInvitation();
  }, [inviteCode, inviteEmail]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // If this was an invitation signup, accept the invitation
      if (isInviteMode && inviteCode) {
        await acceptFamilyInvitation(user.uid, inviteCode);
      }
      
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error("SIGNUP ERROR:", error);
      
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        if (error.code === 'auth/email-already-in-use') {
          setError('This email is already registered. Please log in instead.');
        } else if (error.code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else if (error.code === 'auth/weak-password') {
          setError('Password is too weak. Please use at least 6 characters.');
        } else {
          setError(`Failed to create account: ${error.message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow">
        <div className="text-center">
          <div className="flex justify-center">
            <Sprout className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {isInviteMode ? 'Join the Family' : 'Create your account'}
          </h2>
          {isInviteMode && familyName && (
            <p className="mt-2 text-sm text-emerald-600">
              You've been invited to join {familyName}
            </p>
          )}
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-medium text-emerald-500 hover:text-emerald-600"
            >
              Sign in
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isInviteMode}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : isInviteMode ? 'Join Family' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}