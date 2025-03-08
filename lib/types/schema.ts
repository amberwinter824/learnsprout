// lib/types/schema.ts
import { Timestamp } from 'firebase/firestore';

// Enhanced Activity Interface
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

// Enhanced User Interface
export interface User {
  id?: string;
  email: string;
  displayName?: string;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
  
  // New fields for role management
  role: "parent" | "educator" | "admin" | "specialist";
  associatedInstitutions?: string[]; // References to institutions collection
  
  preferences?: {
    emailNotifications: boolean;
    weeklyDigest: boolean;
    theme: string;
  };
}

// Enhanced Progress Record Interface
export interface ProgressRecord {
  id?: string;
  childId: string;
  userId: string;
  activityId: string;
  date: Timestamp | Date;
  completionStatus: 'started' | 'in_progress' | 'completed';
  engagementLevel: 'low' | 'medium' | 'high';
  interestLevel: 'low' | 'medium' | 'high';
  completionDifficulty: 'easy' | 'appropriate' | 'challenging';
  notes: string;
  
  // New fields for environment context
  environmentContext: "home" | "school" | "other";
  observationType: "milestone" | "interest" | "challenge" | "general";
  visibility: string[]; // References to users or roles who can see this
  
  photoUrls?: string[];
  skillsDemonstrated: string[];
  skillObservations?: Record<string, string>;
  weeklyPlanId?: string;
  dayOfWeek?: string;
  createdAt?: any;
  updatedAt?: any;
}

// New Institution Interface
export interface Institution {
  id?: string;
  name: string;
  type: string; // "montessori", "reggio", "play-based", etc.
  administratorIds: string[]; // References to users with admin access
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// New Classroom Interface
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

// New Classroom-Child Relationship Interface
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

// New Message Interface
export interface Message {
  id?: string;
  senderId: string; // Reference to users collection
  recipientIds: string[]; // References to users collection
  childId?: string; // Optional reference to relevant child
  subject: string;
  content: string;
  contextType: "activity" | "observation" | "general";
  contextId?: string; // Reference to context object if applicable
  read: boolean;
  createdAt?: Timestamp;
}