// lib/types/enhancedSchema.ts
import { Timestamp } from 'firebase/firestore';

/**
 * Enhanced Activity Type with environment context fields
 */
export interface Activity {
  id?: string;
  title: string;
  description?: string;
  instructions?: string;
  ageRanges: string[];  // ["0-1", "1-2", "2-3", "3-4", "4-5", "5-6"]
  area: string;      // "practical_life", "sensorial", "language", etc.
  materialsNeeded?: string[];
  duration?: number;  // In minutes
  difficulty: string; // "beginner", "intermediate", "advanced"
  status: string;    // "draft", "active", "archived"
  imageUrl?: string;
  
  // New fields for environment context
  environmentType: "home" | "classroom" | "bridge";
  classroomExtension: boolean; // Whether activity extends classroom learning
  homeReinforcement: boolean;  // Whether activity reinforces home concepts
  
  // Existing relationships
  prerequisites?: string[]; // References to other activity IDs
  nextSteps?: string[];    // References to follow-up activity IDs
  relatedActivities?: string[]; // References to similar activity IDs
  skillsAddressed: string[]; // References to developmentalSkills collection
  
  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Enhanced User Type with role and institution fields
 */
export interface User {
  id?: string;
  email: string;
  name?: string;
  displayName?: string;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
  
  // New fields for role management
  role: "parent" | "educator" | "admin" | "specialist";
  associatedInstitutions?: string[]; // References to institutions collection
  
  // Other fields
  preferences?: {
    emailNotifications: boolean;
    weeklyDigest: boolean;
    theme: string;
  };
  updatedAt?: Timestamp;
}

/**
 * Enhanced Progress Record Type with environment context
 */
export interface ProgressRecord {
  id?: string;
  childId: string;
  userId: string;
  activityId: string;
  date: Timestamp | Date;
  completionStatus: 'started' | 'in_progress' | 'completed';
  engagementLevel: 'low' | 'medium' | 'high';
  interestLevel: 'low' | 'medium' | 'high';
  completionDifficulty?: 'easy' | 'appropriate' | 'challenging';
  notes: string;
  
  // New fields for environment context
  environmentContext: "home" | "school" | "other";
  observationType: "milestone" | "interest" | "challenge" | "general";
  visibility: string[]; // User IDs or special values like 'all' or 'educators'
  
  // Other fields
  photoUrls?: string[];
  skillsDemonstrated: string[];
  skillObservations?: Record<string, string>;
  weeklyPlanId?: string;
  dayOfWeek?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Child Type (existing)
 */
export interface Child {
  id?: string;
  name: string;
  birthDate?: Timestamp;
  birthDateString?: string;
  parentId: string;
  userId: string;
  ageGroup: string;
  active: boolean;
  interests: string[];
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastPlanGenerated?: Timestamp;
}

/**
 * NEW: Institution Type
 */
export interface Institution {
  id?: string;
  name: string;
  type: string; // "montessori", "reggio", "play-based", etc.
  administratorIds: string[]; // References to users with admin access
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * NEW: Classroom Type
 */
export interface Classroom {
  id?: string;
  name: string;
  institutionId: string; // Reference to institutions collection
  educatorIds: string[]; // References to users with educator role
  ageGroups: string[]; // ["3-4", "4-5", etc.]
  currentThemes: string[]; // Current classroom curriculum focus
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * NEW: Classroom-Child Relationship Type
 */
export interface ClassroomChild {
  id?: string;
  childId: string; // Reference to children collection
  classroomId: string; // Reference to classrooms collection
  startDate: Timestamp;
  schedule: string[]; // ["monday", "wednesday", "friday"]
  status: "active" | "former";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * NEW: Message Type
 */
export interface Message {
  id?: string;
  senderId: string; // Reference to users collection
  recipientIds: string[]; // References to users collection
  childId?: string; // Optional reference to relevant child
  subject: string;
  content: string;
  contextType: "activity" | "observation" | "general";
  contextId?: string; // Reference to context object if applicable
  read: Record<string, boolean>; // Map of user IDs to read status
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Permission Type Definition
 */
export type Permission = 
  | "manage_children"
  | "view_children" 
  | "manage_activities" 
  | "manage_institutions"
  | "manage_classrooms"
  | "view_observations"
  | "create_observations";

/**
 * Role to Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  "parent": [
    "manage_children", 
    "view_children", 
    "view_observations",
    "create_observations"
  ],
  "educator": [
    "view_children", 
    "manage_activities", 
    "view_observations",
    "create_observations",
    "manage_classrooms"
  ],
  "admin": [
    "manage_children",
    "view_children", 
    "manage_activities", 
    "manage_institutions",
    "manage_classrooms",
    "view_observations",
    "create_observations"
  ],
  "specialist": [
    "view_children", 
    "view_observations",
    "create_observations"
  ]
};