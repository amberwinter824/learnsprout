import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, ArrowRight, Activity, MessageSquare, Info, X } from 'lucide-react';
import { DevelopmentalSkill, PediatricVisit, EnhancedChildSkill } from '../../../lib/types/enhancedSchema';
import { ASQDomain, formatASQDomain, PediatricVisitMonth, PEDIATRIC_VISIT_MONTHS } from '../../../lib/types/asqTypes';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, limit } from 'firebase/firestore';
import { differenceInMonths } from 'date-fns';

interface PediatricVisitPrepProps {
  childId: string;
  childAge: number; // Age in months
  onActivitySelect?: (activityId: string) => void;
}

interface DomainProgress {
  domain: ASQDomain;
  status: 'not_started' | 'in_progress' | 'ready';
  progress: number;
  observations: number;
  activities: number;
}

// ASQ domain colors and icons (same as in ActivityObservationCard)
const domainColors: Record<ASQDomain, string> = {
  'communication': 'bg-blue-100 text-blue-800 border-blue-300',
  'gross_motor': 'bg-green-100 text-green-800 border-green-300',
  'fine_motor': 'bg-purple-100 text-purple-800 border-purple-300',
  'problem_solving': 'bg-amber-100 text-amber-800 border-amber-300',
  'personal_social': 'bg-pink-100 text-pink-800 border-pink-300'
};

const domainIcons: Record<ASQDomain, React.ReactNode> = {
  'communication': '🗣️',
  'gross_motor': '🏃',
  'fine_motor': '✋',
  'problem_solving': '🧩',
  'personal_social': '👪'
};

// Sample ASQ questionnaire data for different ages
const asqQuestionnaires: Record<string, {title: string, description: string, questions: Record<ASQDomain, string[]>}> = {
  '2m': {
    title: 'ASQ-3 2 Month Questionnaire',
    description: 'For infants 1 month 0 days through 2 months 30 days',
    questions: {
      'communication': [
        'Does your baby sometimes make throaty or gurgling sounds?',
        'Does your baby react to loud sounds?'
      ],
      'gross_motor': [
        'When your baby is on their back, do they move their legs?',
        'When your baby is on their tummy, do they turn their head to the side?'
      ],
      'fine_motor': [
        'Does your baby keep their hands open or partly open most of the time?',
        'Does your baby grasp or hold onto your finger if you touch their palm?'
      ],
      'problem_solving': [
        'Does your baby look at objects that are 8–10 inches away?',
        'When you move around, does your baby follow you with their eyes?'
      ],
      'personal_social': [
        'Does your baby calm down when you talk to them?',
        'Does your baby enjoy being held and cuddled?'
      ]
    }
  },
  '12m': {
    title: 'ASQ-3 12 Month Questionnaire',
    description: 'For infants 11 months 0 days through 12 months 30 days',
    questions: {
      'communication': [
        'Does your baby make two similar sounds like "ba-ba," "da-da," or "ga-ga"?',
        'Does your baby follow one simple command, such as "Come here," "Give it to me," or "Put it back," without your using gestures?'
      ],
      'gross_motor': [
        'When you hold one hand just to balance your baby, does he take several steps without tripping or falling?',
        'Does your baby stand up in the middle of the floor by herself and take several steps forward?'
      ],
      'fine_motor': [
        'Does your baby pick up a small toy with only his thumb and first finger?',
        'Does your baby put a small toy down, without dropping it, and then take her hands off the toy?'
      ],
      'problem_solving': [
        'After watching you hide a small toy under a piece of paper or cloth, does your baby find it?',
        'Does your baby drop two small toys, one after the other, into a container like a bowl or cup?'
      ],
      'personal_social': [
        'Does your baby feed himself with his fingers?',
        'When you hold out your hand and ask for her toy, does your baby offer it to you even if she doesn\'t let go of it?'
      ]
    }
  },
  '24m': {
    title: 'ASQ-3 24 Month Questionnaire',
    description: 'For children 23 months 0 days through 25 months 15 days',
    questions: {
      'communication': [
        'Does your child name at least three items from a common category? For example, if you say to your child, "Tell me some things that you can eat," does your child answer with something like "Cookies, eggs, and cereal"?',
        'Does your child use the word "my" or "mine" when talking?'
      ],
      'gross_motor': [
        'Does your child run fairly well, stopping himself without bumping into things or falling?',
        'Does your child walk down stairs if you hold onto one of her hands?'
      ],
      'fine_motor': [
        'Does your child make a line with a crayon or pencil?',
        'Does your child turn pages in a book, one page at a time?'
      ],
      'problem_solving': [
        'If your child wants something they cannot reach, does she find a chair or box to stand on to reach it?',
        'Does your child successfully use a spoon, fork, and cup all by himself?'
      ],
      'personal_social': [
        'Does your child copy activities you do, such as wipe up a spill, sweep, shave, or comb hair?',
        'Does your child drink from a cup or glass, putting it down again with little spilling?'
      ]
    }
  }
};

export default function PediatricVisitPrep({ childId, childAge, onActivitySelect }: PediatricVisitPrepProps) {
  const [loading, setLoading] = useState(true);
  const [nextVisit, setNextVisit] = useState<Partial<PediatricVisit> | null>(null);
  const [domainProgress, setDomainProgress] = useState<DomainProgress[]>([]);
  const [recommendedActivities, setRecommendedActivities] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [showAllObservations, setShowAllObservations] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<ASQDomain | null>(null);
  const [showAsqPopup, setShowAsqPopup] = useState(false);
  const [skills, setSkills] = useState<DevelopmentalSkill[]>([]);
  
  // Ensure childAge is a valid number
  const safeChildAge = typeof childAge === 'number' && !isNaN(childAge) ? childAge : 0;
  
  // Get the visit type based on age
  const getVisitTypeForAge = (ageMonths: number): `${PediatricVisitMonth}m` => {
    // Find next upcoming visit
    const nextVisitMonth = PEDIATRIC_VISIT_MONTHS.find(month => month > ageMonths) || 60;
    return `${nextVisitMonth}m`;
  };

  // Get ASQ questionnaire based on visit type
  const getAsqQuestionnaire = (visitType: string) => {
    // Try to get exact match first
    const exactMatch = asqQuestionnaires[visitType];
    if (exactMatch) return exactMatch;
    
    // If not found, get the closest match
    const visitMonth = parseInt(visitType.replace('m', ''));
    const availableMonths = Object.keys(asqQuestionnaires).map(m => parseInt(m.replace('m', '')));
    
    // Get closest month
    const closestMonth = availableMonths.reduce((prev, curr) => 
      Math.abs(curr - visitMonth) < Math.abs(prev - visitMonth) ? curr : prev
    );
    
    return asqQuestionnaires[`${closestMonth}m`] || asqQuestionnaires['24m']; // Default to 24m if nothing found
  };
  
  useEffect(() => {
    async function fetchVisitPreparation() {
      try {
        setLoading(true);
        setErrorMessage(null);
        
        // 1. Get child information from Firestore to double-check age
        const childDoc = await getDoc(doc(db, 'children', childId));
        let verifiedChildAge = safeChildAge;
        
        if (childDoc.exists()) {
          const childData = childDoc.data();
          if (childData.birthDate) {
            // Convert to date object if it's a timestamp
            const birthDate = childData.birthDate.toDate ? 
              childData.birthDate.toDate() : 
              new Date(childData.birthDate);
              
            // Calculate age directly
            verifiedChildAge = differenceInMonths(new Date(), birthDate);
          }
        }
        
        // 2. Get or create pediatric visit
        let visitData: Partial<PediatricVisit> = {
          childId: childId,
          visitType: getVisitTypeForAge(verifiedChildAge),
          scheduledDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // Dummy date 30 days in future
          asqPreparation: {
            communication: { activities: [], observations: [], status: 'not_started' },
            grossMotor: { activities: [], observations: [], status: 'not_started' },
            fineMotor: { activities: [], observations: [], status: 'not_started' },
            problemSolving: { activities: [], observations: [], status: 'not_started' },
            personalSocial: { activities: [], observations: [], status: 'not_started' }
          }
        };
        
        // Check if a visit record already exists
        try {
          const visitsQuery = query(
            collection(db, 'pediatricVisits'),
            where('childId', '==', childId),
            where('visitType', '==', visitData.visitType)
          );
          
          const visitSnapshot = await getDocs(visitsQuery);
          if (!visitSnapshot.empty) {
            visitData = { id: visitSnapshot.docs[0].id, ...visitSnapshot.docs[0].data() } as PediatricVisit;
          }
        } catch (err) {
          console.error("Error fetching visit data:", err);
          // Continue with default visit data
        }
        
        setNextVisit(visitData);
        
        // Initialize variables for skill data
        let childSkillsData: EnhancedChildSkill[] = [];
        let skillsData: DevelopmentalSkill[] = [];
        
        // 2. Fetch child's skill observations
        try {
          const childSkillsQuery = query(
            collection(db, 'childSkills'),
            where('childId', '==', childId)
          );
          
          const childSkillsSnapshot = await getDocs(childSkillsQuery);
          childSkillsData = childSkillsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          })) as EnhancedChildSkill[];
          
          // 3. Get skills to determine ASQ domains
          const skillIds = childSkillsData.map(cs => cs.skillId);
          
          if (skillIds.length > 0) {
            // Fetch in batches if many skills
            const batchSize = 10;
            for (let i = 0; i < skillIds.length; i += batchSize) {
              const batch = skillIds.slice(i, i + batchSize);
              
              // Adjust query to fetch all developmental skills instead of filtering by ID
              // This ensures we get skills even if they have different ID formats
              const skillsQuery = query(
                collection(db, 'developmentalSkills')
              );
              
              const skillsSnapshot = await getDocs(skillsQuery);
              skillsData = skillsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
              })) as DevelopmentalSkill[];
            }
          }
        } catch (err) {
          console.error("Error fetching skills data:", err);
          // If we can't access the database, use mock data
          if (err instanceof Error && err.toString().includes("Missing or insufficient permissions")) {
            setErrorMessage("Limited data access: Using preview mode");
            
            // Generate mock data
            childSkillsData = generateMockChildSkills(childId);
            skillsData = generateMockSkills();
          }
        }
        
        // 4. Calculate domain progress
        const domains: ASQDomain[] = ['communication', 'gross_motor', 'fine_motor', 'problem_solving', 'personal_social'];
        const progress = domains.map(domain => {
          // Find skills with appropriate area that maps to this ASQ domain
          const domainSkills = skillsData.filter(skill => {
            // First check if skill has asqDomain property
            if (skill.asqDomain === domain) {
              return true;
            }
            
            // If not, try to map the skill area to domain
            const mappedDomain = mapAreaToDomain(skill.area);
            return mappedDomain === domain;
          });
          
          const skillIds = domainSkills.map(skill => skill.id);
          
          // Find child skills that match these skill IDs
          const matchingChildSkills = childSkillsData.filter(cs => {
            // Try to find a match by skillId in our domain skills
            return skillIds.some(id => cs.skillId === id);
          });
          
          // Count skills with status (emerging, developing, mastered)
          const skillsWithStatus = matchingChildSkills.filter(cs => 
            cs.status === 'emerging' || cs.status === 'developing' || cs.status === 'mastered'
          ).length;
          
          // Count observations for this domain
          const domainObservations = matchingChildSkills
            .filter(cs => cs.observations && cs.observations.length > 0)
            .reduce((total, cs) => total + (cs.observations?.length || 0), 0);
          
          // Calculate progress percentage - this is just an example logic
          const observationsNeeded = 3; // Example: need 3 observations per domain
          const activitiesNeeded = 2; // Example: need 2 activities per domain
          
          const domainActivities = visitData.asqPreparation?.[domain as keyof typeof visitData.asqPreparation]?.activities.length || 0;
          
          // Set a minimum progress of 0% if we have matching skills, even if no observations
          let progressPercentage = 0;
          if (skillsWithStatus > 0) {
            progressPercentage = Math.min(100, Math.round(
              ((domainObservations / observationsNeeded) * 0.7 + (domainActivities / activitiesNeeded) * 0.3) * 100
            ));
          }
          
          // Determine status
          let status: 'not_started' | 'in_progress' | 'ready' = 'not_started';
          if (progressPercentage >= 100) status = 'ready';
          else if (progressPercentage > 0) status = 'in_progress';
          
          return {
            domain,
            status,
            progress: progressPercentage,
            observations: domainObservations,
            activities: domainActivities
          };
        });
        
        setDomainProgress(progress);
        
        // 5. Get recent observations (for display)
        interface ObservationDisplay {
          id: string;
          text: string;
          date: Date;
          skillId: string;
          skillName: string;
          domain: ASQDomain;
        }
        
        const recentObservations = childSkillsData
          .filter(cs => cs.observations && cs.observations.length > 0)
          .flatMap(cs => (cs.observations || []).map((obs: any, idx: number) => {
            // Get the observation text based on whether it's a string or an object
            const observationText = typeof obs === 'string' ? obs : obs.text;
            
            // Handle date safely
            let observationDate: Date;
            if (typeof obs === 'object' && obs !== null && obs.date) {
              // It's an object with a date property
              const dateObj = obs.date;
              if (typeof dateObj === 'object' && dateObj !== null && 'toDate' in dateObj) {
                observationDate = dateObj.toDate();
              } else if (dateObj instanceof Date) {
                observationDate = dateObj;
              } else {
                observationDate = new Date();
              }
            } else if (cs.observationDates && cs.observationDates[idx]) {
              const dateObj = cs.observationDates[idx];
              if (typeof dateObj === 'object' && dateObj !== null && 'toDate' in dateObj) {
                observationDate = dateObj.toDate();
              } else {
                // Use casting to help TypeScript understand this is safe
                const castDateObj = dateObj as any;
                if (castDateObj instanceof Date) {
                  observationDate = castDateObj;
                } else {
                  observationDate = new Date();
                }
              }
            } else {
              observationDate = new Date();
            }
            
            return {
              id: `${cs.id}_${idx}`,
              text: observationText,
              date: observationDate,
              skillId: cs.skillId,
              skillName: skillsData.find(s => s.id === cs.skillId)?.name || 'Unknown Skill',
              domain: skillsData.find(s => s.id === cs.skillId)?.asqDomain || 'problem_solving'
            } as ObservationDisplay;
          }))
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 10); // Get most recent 10
        
        setObservations(recentObservations);
        
        // 6. Get recommended activities
        // Get or create activities for low progress domains
        const activitiesQuery = query(
          collection(db, 'activities'),
          where('ageRanges', 'array-contains', childDoc.exists() ? childDoc.data().ageGroup : '2-3'),
          where('status', '==', 'active'),
          limit(10)
        );
        
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const activityData = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Add type safety for skillsAddressed
        type ActivityWithSkills = {
          id: string;
          skillsAddressed?: string[];
          [key: string]: any;
        };
        
        // Filter and sort activities by domain relevance
        const sortedDomains = [...progress].sort((a, b) => a.progress - b.progress);
        const lowProgressDomains = sortedDomains.slice(0, 3).map(d => d.domain);
        
        // Prioritize activities for domains with low progress
        const prioritizedActivities = (activityData as ActivityWithSkills[])
          .filter(activity => {
            if (!activity.skillsAddressed || activity.skillsAddressed.length === 0) {
              return true; // Include activities without specific skills
            }
            
            // Find matching skills and their domains
            const activityDomains = activity.skillsAddressed
              .map((skillId: string) => skillsData.find(s => s.id === skillId)?.asqDomain || null)
              .filter(Boolean) as ASQDomain[];
              
            // Check if any of the domains are low progress domains
            return activityDomains.some(domain => lowProgressDomains.includes(domain));
          })
          .slice(0, 5); // Limit to 5 activities
          
        setRecommendedActivities(prioritizedActivities);
        
        setSkills(skillsData);
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching preparation data:", err);
        setErrorMessage("Failed to load preparation data");
        setLoading(false);
      }
    }
    
    fetchVisitPreparation();
  }, [childId, safeChildAge]);
  
  // Handle domain selection/toggle
  const handleDomainClick = (domain: ASQDomain) => {
    if (selectedDomain === domain) {
      setSelectedDomain(null); // Toggle off if already selected
    } else {
      setSelectedDomain(domain); // Select new domain
    }
  };
  
  // Handle activity selection
  const handleActivitySelect = (activityId: string) => {
    if (onActivitySelect) {
      onActivitySelect(activityId);
    }
  };
  
  // Helper functions for UI
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500 mr-1" />;
      case 'in_progress':
        return <Activity className="h-5 w-5 text-blue-500 mr-1" />;
      case 'not_started':
      default:
        return <AlertCircle className="h-5 w-5 text-amber-500 mr-1" />;
    }
  };
  
  // Handle safely converting a Timestamp to a Date for display
  const safeTimestampToDate = (timestamp: any): string => {
    if (!timestamp) return 'Not scheduled';
    
    try {
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
      } else if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString();
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    
    return 'Soon';
  };
  
  // Function to generate mock child skills for preview mode
  function generateMockChildSkills(childId: string): EnhancedChildSkill[] {
    const mockSkills = [
      {
        id: 'mock-cs-1',
        childId,
        skillId: 'skill-1',
        status: 'emerging' as const,
        observations: ['Can stack 3 blocks without help', 'Uses pincer grasp to pick up small objects'],
        observationDates: [new Date(), new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]
      },
      {
        id: 'mock-cs-2',
        childId,
        skillId: 'skill-2',
        status: 'developing' as const,
        observations: ['Follows two-step instructions', 'Responds to simple questions appropriately'],
        observationDates: [new Date(), new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)]
      },
      {
        id: 'mock-cs-3',
        childId,
        skillId: 'skill-3',
        status: 'emerging' as const,
        observations: ['Sorts by color'],
        observationDates: [new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)]
      }
    ];
    
    // Convert to EnhancedChildSkill by casting through unknown
    return mockSkills as unknown as EnhancedChildSkill[];
  }
  
  // Function to generate mock skills
  function generateMockSkills(): DevelopmentalSkill[] {
    return [
      {
        id: 'skill-1',
        name: 'Fine Motor Control',
        description: 'Uses small muscles in hands and fingers with increasing control',
        area: 'sensorial',
        ageRanges: ['2-3', '3-4'],
        asqDomain: 'fine_motor'
      },
      {
        id: 'skill-2',
        name: 'Following Directions',
        description: 'Understands and follows simple verbal instructions',
        area: 'language',
        ageRanges: ['2-3', '3-4'],
        asqDomain: 'communication'
      },
      {
        id: 'skill-3',
        name: 'Visual Discrimination',
        description: 'Distinguishes between similar objects based on visual properties',
        area: 'cognitive',
        ageRanges: ['2-3', '3-4'],
        asqDomain: 'problem_solving'
      },
      {
        id: 'skill-4',
        name: 'Gross Motor Skills',
        description: 'Uses large muscles for coordinated movements',
        area: 'movement',
        ageRanges: ['2-3', '3-4'],
        asqDomain: 'gross_motor'
      },
      {
        id: 'skill-5',
        name: 'Social Interaction',
        description: 'Engages with others in play and activities',
        area: 'social',
        ageRanges: ['2-3', '3-4'],
        asqDomain: 'personal_social'
      }
    ] as DevelopmentalSkill[];
  }
  
  // Helper to safely access domain colors
  const getDomainColor = (domain: any): string => {
    if (domain && typeof domain === 'string' && Object.keys(domainColors).includes(domain)) {
      return domainColors[domain as ASQDomain];
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };
  
  // Map skill areas to their corresponding domains
  const mapAreaToDomain = (area: string): ASQDomain | null => {
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
  };
  
  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-4 bg-red-50 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <>
          {/* Next Checkup */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
              Preparing for {nextVisit?.visitType} Checkup
            </h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">
                  Child's age: <span className="font-medium">{safeChildAge} months</span>
                </p>
                {nextVisit?.scheduledDate && (
                  <p className="text-sm text-gray-600 mt-1">
                    Scheduled for: <span className="font-medium">{safeTimestampToDate(nextVisit.scheduledDate)}</span>
                  </p>
                )}
              </div>
              
              <button
                onClick={() => setShowAsqPopup(true)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Info className="h-4 w-4 mr-1.5" />
                Preview ASQ
              </button>
            </div>
            
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Progress by ASQ Domain</h3>
              
              <div className="space-y-3">
                {domainProgress.map((domain) => (
                  <div
                    key={domain.domain}
                    onClick={() => handleDomainClick(domain.domain)}
                    className={`p-3 border rounded-md ${
                      selectedDomain === domain.domain
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                    } cursor-pointer transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`${getDomainColor(domain.domain)} w-8 h-8 rounded-full flex items-center justify-center mr-3`}>
                          <span className="text-lg">{domainIcons[domain.domain as ASQDomain]}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {formatASQDomain(domain.domain as ASQDomain)}
                          </h4>
                          <div className="flex items-center mt-1">
                            <div className="w-24 bg-gray-200 rounded-full h-1.5 mr-2">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${domain.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {domain.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center">
                          {getStatusIcon(domain.status)}
                          <span className="text-xs text-gray-500 ml-1 capitalize">
                            {domain.status === 'not_started' ? 'Not Started' : domain.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {domain.observations} observation{domain.observations !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Activities */}
          {selectedDomain && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-3">
                Recommended Activities for {formatASQDomain(selectedDomain as ASQDomain)}
              </h2>
              
              {recommendedActivities.filter(activity => {
                const matchesDomain = activity.skillsAddressed?.some(
                  (skillId: string) => {
                    const skill = skills.find(s => s.id === skillId);
                    return skill && mapAreaToDomain(skill.area) === selectedDomain;
                  }
                );
                return matchesDomain;
              }).length > 0 ? (
                <div className="space-y-3">
                  {recommendedActivities
                    .filter(activity => {
                      const matchesDomain = activity.skillsAddressed?.some(
                        (skillId: string) => {
                          const skill = skills.find(s => s.id === skillId);
                          return skill && mapAreaToDomain(skill.area) === selectedDomain;
                        }
                      );
                      return matchesDomain;
                    })
                    .map((activity) => (
                      <div
                        key={activity.id}
                        className="p-4 border border-gray-200 rounded-md hover:border-emerald-300 cursor-pointer"
                        onClick={() => handleActivitySelect(activity.id)}
                      >
                        <h3 className="text-sm font-medium text-gray-900">{activity.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {activity.skillsAddressed?.map((skillId: string) => {
                            const skill = skills.find(s => s.id === skillId);
                            if (!skill) return null;
                            
                            const domain = mapAreaToDomain(skill.area);
                            if (!domain || domain !== selectedDomain) return null;
                            
                            // Since we've checked that domain is not null and matches selectedDomain,
                            // which is of type ASQDomain, we can safely assert the type
                            const safeColorClass = domainColors[domain as ASQDomain];
                            
                            return (
                              <span
                                key={skillId}
                                className={`${safeColorClass} text-xs px-2 py-0.5 rounded-full`}
                              >
                                {skill.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-gray-500">No specific activities for this domain yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Recent Observations */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-medium text-gray-900">
                Recent Observations
              </h2>
              
              {observations.length > 3 && (
                <button 
                  onClick={() => setShowAllObservations(!showAllObservations)}
                  className="text-sm text-emerald-600 hover:text-emerald-700"
                >
                  {showAllObservations ? 'Show Less' : 'View All'}
                </button>
              )}
            </div>
            
            {observations.length > 0 ? (
              <div className="space-y-3">
                {(showAllObservations ? observations : observations.slice(0, 3))
                  .filter(obs => !selectedDomain || obs.domain === selectedDomain)
                  .map((observation) => (
                    <div key={observation.id} className="p-4 border border-gray-200 rounded-md">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{observation.skillName}</h3>
                          <span className={`mt-1 inline-block ${domainColors[observation.domain as ASQDomain]} text-xs px-2 py-0.5 rounded-full`}>
                            {formatASQDomain(observation.domain as ASQDomain)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {observation.date instanceof Date 
                            ? observation.date.toLocaleDateString() 
                            : new Date(observation.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{observation.text}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-gray-500">No observations recorded yet.</p>
              </div>
            )}
          </div>
          
          {/* ASQ Preview Popup */}
          {showAsqPopup && nextVisit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {getAsqQuestionnaire(nextVisit.visitType?.toString() || '24m').title}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {getAsqQuestionnaire(nextVisit.visitType?.toString() || '24m').description}
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowAsqPopup(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {Object.entries(getAsqQuestionnaire(nextVisit.visitType?.toString() || '24m').questions).map(([domain, questions]) => (
                      <div key={domain} className="border border-gray-200 rounded-lg p-4">
                        <h3 className={`text-lg font-medium mb-3 flex items-center ${getDomainColor(domain as ASQDomain).replace('bg-', 'text-').replace('-100', '-700')}`}>
                          <span className="mr-2">{domainIcons[domain as ASQDomain]}</span>
                          {formatASQDomain(domain as ASQDomain)}
                        </h3>
                        
                        <ul className="space-y-3">
                          {questions.map((question, index) => (
                            <li key={index} className="flex items-start">
                              <span className="font-medium text-gray-600 mr-2">{index + 1}.</span>
                              <span className="text-gray-700">{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-blue-800">About ASQ Questionnaires</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          The Ages and Stages Questionnaire (ASQ) is a developmental screening tool used during pediatric checkups to assess your child's progress in key developmental domains. Your doctor will cover these questions at your child's next checkup.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setShowAsqPopup(false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                    >
                      Close Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 