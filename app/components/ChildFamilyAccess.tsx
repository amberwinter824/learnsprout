// app/components/ChildFamilyAccess.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, Info, UserCheck } from 'lucide-react';

interface ChildFamilyAccessProps {
  childId: string;
  childName: string;
  familyId?: string;
}

export default function ChildFamilyAccess({ childId, childName, familyId }: ChildFamilyAccessProps) {
  const { currentUser, getFamilyMembers } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState('');
  
  useEffect(() => {
    async function loadFamilyData() {
      if (!familyId) {
        setLoading(false);
        return;
      }
      
      try {
        // Get family details
        const familyDoc = await getDoc(doc(db, 'families', familyId));
        if (familyDoc.exists()) {
          setFamilyName(familyDoc.data().name || 'My Family');
        }
        
        // Get family members
        const members = await getFamilyMembers();
        setFamilyMembers(members.filter(member => member.uid !== currentUser?.uid)); // Exclude current user
      } catch (err) {
        console.error('Error loading family data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadFamilyData();
  }, [familyId, currentUser, getFamilyMembers]);
  
  if (loading) {
    return (
      <div className="flex justify-center p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }
  
  // If child is not in a family
  if (!familyId) {
    return (
      <div className="bg-gray-50 rounded-md p-3 mb-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
          <div>
            <p className="text-sm text-gray-600">
              {childName} is not shared with any family members.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              To share this profile with other caregivers, add {childName} to a family in Family Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-blue-50 rounded-md p-3 mb-4">
      <div className="flex items-start">
        <Users className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-700">
            {childName} is part of the {familyName}
          </p>
          
          {familyMembers.length > 0 ? (
            <div className="mt-2">
              <p className="text-xs text-blue-600 mb-1">
                {childName}'s profile is shared with:
              </p>
              <ul className="space-y-1">
                {familyMembers.map(member => (
                  <li key={member.uid} className="flex items-center text-xs text-blue-700">
                    <UserCheck className="h-3 w-3 mr-1 text-blue-500" />
                    {member.name || member.email || 'Family Member'}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-blue-600 mt-1">
              No other family members can access this profile yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}