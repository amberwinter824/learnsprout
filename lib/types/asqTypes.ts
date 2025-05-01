// asqTypes.ts - Types for ASQ integration features
import { DevelopmentalSkill, PediatricVisit, ASQMilestone } from './enhancedSchema';
import { Timestamp } from 'firebase/firestore';

/**
 * ASQ Domains
 */
export type ASQDomain = 
  | 'communication' 
  | 'gross_motor' 
  | 'fine_motor' 
  | 'problem_solving' 
  | 'personal_social';

/**
 * Standard pediatric visit schedule ages in months
 */
export const PEDIATRIC_VISIT_MONTHS = [2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48, 60] as const;
export type PediatricVisitMonth = typeof PEDIATRIC_VISIT_MONTHS[number];

/**
 * ASQ Questionnaire versions by age
 */
export const ASQ_VERSIONS = {
  '2m': 'ASQ-3 2 Month Questionnaire',
  '4m': 'ASQ-3 4 Month Questionnaire',
  '6m': 'ASQ-3 6 Month Questionnaire',
  '9m': 'ASQ-3 9 Month Questionnaire',
  '12m': 'ASQ-3 12 Month Questionnaire',
  '15m': 'ASQ-3 15 Month Questionnaire',
  '18m': 'ASQ-3 18 Month Questionnaire',
  '24m': 'ASQ-3 24 Month Questionnaire',
  '30m': 'ASQ-3 30 Month Questionnaire',
  '36m': 'ASQ-3 36 Month Questionnaire',
  '48m': 'ASQ-3 48 Month Questionnaire',
  '60m': 'ASQ-3 60 Month Questionnaire',
};

/**
 * Domain to activity mapping for generating preparation recommendations
 */
export interface DomainActivityMapping {
  domain: ASQDomain;
  activities: string[]; // Activity IDs
  skills: string[];    // Skill IDs
}

/**
 * Visit preparation status
 */
export interface VisitPreparation {
  visitType: keyof typeof ASQ_VERSIONS;
  scheduledDate: Timestamp;
  domains: {
    [key in ASQDomain]: {
      status: 'not_started' | 'in_progress' | 'ready';
      completionPercentage: number;
    }
  };
  overallCompletionPercentage: number;
}

/**
 * Development Journey tracking
 */
export interface DevelopmentJourney {
  childId: string;
  domains: {
    [key in ASQDomain]: {
      milestones: {
        id: string;
        achieved: boolean;
        achievedAt?: Timestamp;
        description: string;
      }[];
      progressPercentage: number;
    }
  };
}

/**
 * Helper functions
 */

/**
 * Gets the next upcoming pediatric visit based on child's age in months
 */
export function getNextVisitMonth(childAgeMonths: number): PediatricVisitMonth | null {
  const nextVisit = PEDIATRIC_VISIT_MONTHS.find(month => month > childAgeMonths);
  return nextVisit || null;
}

/**
 * Groups developmental skills by ASQ domain
 */
export function groupSkillsByASQDomain(skills: DevelopmentalSkill[]): Record<ASQDomain, DevelopmentalSkill[]> {
  const domains: Record<ASQDomain, DevelopmentalSkill[]> = {
    'communication': [],
    'gross_motor': [],
    'fine_motor': [],
    'problem_solving': [],
    'personal_social': []
  };
  
  skills.forEach(skill => {
    if (skill.asqDomain) {
      domains[skill.asqDomain].push(skill);
    } else {
      // Default to problem solving if no domain is specified
      domains['problem_solving'].push(skill);
    }
  });
  
  return domains;
}

/**
 * Formats ASQ domain for display
 */
export function formatASQDomain(domain: ASQDomain): string {
  switch (domain) {
    case 'communication': return 'Communication';
    case 'gross_motor': return 'Gross Motor';
    case 'fine_motor': return 'Fine Motor';
    case 'problem_solving': return 'Problem Solving';
    case 'personal_social': return 'Personal-Social';
    default: return domain;
  }
} 