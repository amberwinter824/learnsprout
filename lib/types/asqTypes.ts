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

/**
 * Maps a skill area to its corresponding ASQ domain
 * Use this function across components for consistent domain mapping
 */
export function mapSkillAreaToASQDomain(area: string | undefined): ASQDomain | null {
  if (!area) return null;
  
  // Convert to lowercase and remove any spaces/special chars for consistent matching
  const normalizedArea = area.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const domainMap: Record<string, ASQDomain> = {
    // Communication related areas
    'language': 'communication',
    'communication': 'communication',
    'speaking': 'communication',
    'listening': 'communication',
    'vocabulary': 'communication',
    'linguisticintelligence': 'communication',
    'speech': 'communication',
    
    // Gross motor related areas
    'grossmotor': 'gross_motor',
    'physical': 'gross_motor',
    'movement': 'gross_motor',
    'bodyawareness': 'gross_motor',
    'largemuscle': 'gross_motor',
    'coordination': 'gross_motor',
    'balance': 'gross_motor',
    
    // Fine motor related areas
    'finemotor': 'fine_motor',
    'handeyecoordination': 'fine_motor',
    'writing': 'fine_motor',
    'drawing': 'fine_motor',
    'grasping': 'fine_motor',
    'manipulation': 'fine_motor',
    'sensorial': 'fine_motor',
    
    // Problem solving related areas
    'problemsolving': 'problem_solving',
    'cognitive': 'problem_solving',
    'thinking': 'problem_solving',
    'reasoning': 'problem_solving',
    'logic': 'problem_solving',
    'mathematics': 'problem_solving',
    'sorting': 'problem_solving',
    'matching': 'problem_solving',
    
    // Personal social related areas
    'personalsocial': 'personal_social',
    'social': 'personal_social',
    'emotional': 'personal_social',
    'selfcare': 'personal_social',
    'independence': 'personal_social',
    'selfhelp': 'personal_social',
    'dailyliving': 'personal_social',
    'interpersonal': 'personal_social'
  };
  
  return domainMap[normalizedArea] || null;
}

/**
 * Gets the ASQ domain for a developmental skill, accounting for both direct domain assignment and area mapping
 */
export function getSkillASQDomain(skill: DevelopmentalSkill | undefined): ASQDomain | null {
  if (!skill) return null;
  
  // First check if skill has asqDomain property
  if (skill.asqDomain) {
    return skill.asqDomain;
  }
  
  // If not, try to map the skill area to domain
  return mapSkillAreaToASQDomain(skill.area);
} 