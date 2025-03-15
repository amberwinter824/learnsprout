// lib/dataTypes.ts
export interface Family {
    id: string;
    name: string;
    ownerId: string;      // Primary account (family creator)
    memberIds: string[];  // Connected accounts
    childrenIds: string[]; // References to children collection
    createdAt?: any;      // Timestamp
    updatedAt?: any;      // Timestamp
  }
  
  export interface FamilyInvitation {
    inviteCode: string;
    familyId: string;
    inviterUserId: string;
    recipientEmail: string;
    status: 'pending' | 'accepted' | 'expired';
    createdAt: any;
    expiresAt: any;
    acceptedAt?: any;
    acceptedByUserId?: string;
  }