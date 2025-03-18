// app/components/FamilyManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  UserPlus, 
  Copy, 
  Check, 
  UserX, 
  Home, 
  AlertCircle, 
  Mail 
} from 'lucide-react';

export default function FamilyManagement() {
  const { 
    currentUser, 
    createFamily, 
    joinFamily, 
    inviteToFamily, 
    getFamilyMembers, 
    leaveFamily 
  } = useAuth();
  
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [createFamilyName, setCreateFamilyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  // UI states
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // Fetch family members on initial load
  useEffect(() => {
    async function loadFamilyMembers() {
      if (!currentUser?.familyId) {
        setLoading(false);
        return;
      }
      
      try {
        const members = await getFamilyMembers();
        setFamilyMembers(members);
      } catch (err) {
        console.error('Error loading family members:', err);
        setError('Failed to load family members');
      } finally {
        setLoading(false);
      }
    }
    
    loadFamilyMembers();
  }, [currentUser, getFamilyMembers]);
  
  // Handler for creating a new family
  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createFamilyName.trim()) {
      setError('Please enter a family name');
      return;
    }
    
    setIsCreatingFamily(true);
    setError('');
    setSuccess('');
    
    try {
      await createFamily(createFamilyName.trim());
      setSuccess('Family created successfully!');
      setCreateFamilyName('');
      
      // Refresh family members
      const members = await getFamilyMembers();
      setFamilyMembers(members);
    } catch (err: any) {
      setError(`Failed to create family: ${err.message}`);
    } finally {
      setIsCreatingFamily(false);
    }
  };
  
  // Handler for inviting someone to family
  const handleInviteToFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    
    setIsInviting(true);
    setError('');
    setSuccess('');
    
    try {
      const url = await inviteToFamily(inviteEmail.trim());
      setInviteUrl(url);
      setSuccess('Invitation created successfully!');
      setInviteEmail('');
    } catch (err: any) {
      setError(`Failed to create invitation: ${err.message}`);
    } finally {
      setIsInviting(false);
    }
  };
  
  // Handler for joining a family
  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinCode.trim()) {
      setError('Please enter an invitation code');
      return;
    }
    
    setIsJoining(true);
    setError('');
    setSuccess('');
    
    try {
      const joined = await joinFamily(joinCode.trim());
      
      if (joined) {
        setSuccess('You have joined the family successfully!');
        setJoinCode('');
        
        // Refresh family members
        const members = await getFamilyMembers();
        setFamilyMembers(members);
      } else {
        setError('Failed to join family. Invalid or expired code.');
      }
    } catch (err: any) {
      setError(`Failed to join family: ${err.message}`);
    } finally {
      setIsJoining(false);
    }
  };
  
  // Handler for leaving a family
  const handleLeaveFamily = async () => {
    if (!confirm('Are you sure you want to leave this family? This action cannot be undone.')) {
      return;
    }
    
    setIsLeaving(true);
    setError('');
    setSuccess('');
    
    try {
      const left = await leaveFamily();
      
      if (left) {
        setSuccess('You have left the family successfully!');
        setFamilyMembers([]);
      } else {
        setError('Failed to leave family.');
      }
    } catch (err: any) {
      setError(`Failed to leave family: ${err.message}`);
    } finally {
      setIsLeaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2 text-emerald-500" />
          Family Management
        </h2>
      </div>
      
      <div className="p-6">
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-md flex items-start">
            <Check className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}
        
        {/* Current Family Status */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Home className="h-4 w-4 mr-1 text-emerald-500" />
            Family Status
          </h3>
          
          {currentUser?.familyId ? (
            <div className="bg-gray-50 rounded-md p-4">
              <p className="text-gray-700">
                <span className="font-medium">Family Name:</span> {currentUser.familyName || 'My Family'}
              </p>
              <p className="text-gray-700 mt-1">
                <span className="font-medium">Role:</span> {currentUser.familyRole === 'owner' ? 'Primary Account' : 'Family Member'}
              </p>
              
              {familyMembers.length > 0 && (
                <div className="mt-3">
                  <p className="font-medium text-gray-700 mb-2">Family Members:</p>
                  <ul className="space-y-2">
                    {familyMembers.map((member) => (
                      <li key={member.uid} className="flex items-center text-sm">
                        <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs mr-2">
                          {member.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span>
                          {member.name || member.email} 
                          {member.uid === currentUser.uid ? ' (You)' : ''}
                          {member.familyRole === 'owner' ? ' (Primary)' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {currentUser.familyRole === 'owner' && (
                <div className="mt-4">
                  <button
                    onClick={() => {/* open modal to manage members */}}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    Manage Family Members
                  </button>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleLeaveFamily}
                  disabled={isLeaving}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {isLeaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600 mr-2"></div>
                  ) : (
                    <UserX className="h-4 w-4 mr-1" />
                  )}
                  {currentUser.familyRole === 'owner' ? 'Dissolve Family' : 'Leave Family'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-md p-4 text-center">
              <p className="text-gray-600 mb-2">
                You are not part of any family yet.
              </p>
              <p className="text-gray-600 text-sm">
                Create a new family or join an existing one using the options below.
              </p>
            </div>
          )}
        </div>
        
        {/* Create or Join Family Section */}
        {!currentUser?.familyId && (
          <div className="space-y-6">
            {/* Create Family Form */}
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Create a Family</h3>
              <form onSubmit={handleCreateFamily}>
                <div className="mb-3">
                  <label htmlFor="familyName" className="block text-xs font-medium text-gray-700 mb-1">
                    Family Name
                  </label>
                  <input
                    type="text"
                    id="familyName"
                    value={createFamilyName}
                    onChange={(e) => setCreateFamilyName(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    placeholder="e.g., Smith Family"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingFamily}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {isCreatingFamily ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Home className="h-4 w-4 mr-1" />
                      Create Family
                    </>
                  )}
                </button>
              </form>
            </div>
            
            {/* Join Family Form */}
            <div className="border rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Join a Family</h3>
              <form onSubmit={handleJoinFamily}>
                <div className="mb-3">
                  <label htmlFor="joinCode" className="block text-xs font-medium text-gray-700 mb-1">
                    Invitation Code
                  </label>
                  <input
                    type="text"
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    placeholder="Enter the invitation code"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {isJoining ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Join Family
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* Invite Member Section - Only show if user is part of a family */}
        {currentUser?.familyId && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <UserPlus className="h-4 w-4 mr-1 text-emerald-500" />
              Invite Family Member
            </h3>
            
            <form onSubmit={handleInviteToFamily}>
              <div className="mb-3">
                <label htmlFor="inviteEmail" className="block text-xs font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="inviteEmail"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="Enter their email address"
                />
              </div>
              <button
                type="submit"
                disabled={isInviting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {isInviting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Creating Invitation...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-1" />
                    Create Invitation
                  </>
                )}
              </button>
            </form>
            
            {/* Display invite URL if available */}
            {inviteUrl && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-md">
                <p className="text-emerald-700 text-sm font-medium mb-2">Invitation link created!</p>
                <div className="flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="bg-white px-3 py-1 rounded border border-emerald-200 text-emerald-800 flex-grow text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="ml-2 inline-flex items-center p-1.5 border border-emerald-300 rounded-md text-emerald-700 hover:bg-emerald-100"
                    title="Copy link"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-emerald-600 mt-2">
                  Share this link with the person you're inviting. They'll be automatically added to your family when they sign up.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}