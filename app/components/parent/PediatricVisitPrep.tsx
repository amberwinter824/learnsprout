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
              const skillsQuery = query(
                collection(db, 'developmentalSkills'),
                where('id', 'in', batch)
              );
              
              const skillsSnapshot = await getDocs(skillsQuery);
              skillsData = [
                ...skillsData,
                ...skillsSnapshot.docs.map(doc => ({ 
                  id: doc.id, 
                  ...doc.data() 
                })) as DevelopmentalSkill[]
              ];
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
          // Count skills by domain
          const domainSkills = skillsData.filter(skill => skill.asqDomain === domain);
          const skillIds = domainSkills.map(skill => skill.id);
          
          // Count observations for this domain
          const domainObservations = childSkillsData
            .filter(cs => skillIds.includes(cs.skillId) && cs.observations && cs.observations.length > 0)
            .reduce((total, cs) => total + (cs.observations?.length || 0), 0);
          
          // Calculate progress percentage - this is just an example logic
          const observationsNeeded = 3; // Example: need 3 observations per domain
          const activitiesNeeded = 2; // Example: need 2 activities per domain
          
          const domainActivities = visitData.asqPreparation?.[domain as keyof typeof visitData.asqPreparation]?.activities.length || 0;
          const progressPercentage = Math.min(100, Math.round(
            ((domainObservations / observationsNeeded) * 0.7 + (domainActivities / activitiesNeeded) * 0.3) * 100
          ));
          
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
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Activity className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
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
  
  return (
    <div className="p-4">
      {loading ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Next checkup section */}
          <div className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Preparing for {nextVisit?.visitType || "Upcoming"} Checkup
                </h3>
                <p className="text-sm text-gray-500">
                  Child's age: {safeChildAge} months • 
                  {nextVisit?.scheduledDate ? (
                    <span> Scheduled for {safeTimestampToDate(nextVisit.scheduledDate)}</span>
                  ) : (
                    <span> Not yet scheduled</span>
                  )}
                </p>
              </div>
              
              <button 
                onClick={() => setShowAsqPopup(true)}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Info className="w-4 h-4 mr-1" />
                <span>Preview ASQ</span>
              </button>
            </div>
          </div>
          
          {errorMessage && (
            <div className="p-3 mb-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              {errorMessage}
            </div>
          )}
          
          {/* Domain progress */}
          <div className="mb-6">
            <h4 className="text-md font-medium mb-3">Progress by ASQ Domain</h4>
            <div className="grid gap-3">
              {domainProgress.map(domain => (
                <div 
                  key={domain.domain} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDomain === domain.domain ? 
                    'border-blue-400 bg-blue-50' : 
                    'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleDomainClick(domain.domain)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block p-1 rounded ${domainColors[domain.domain]}`}>
                        {domainIcons[domain.domain]}
                      </span>
                      <div>
                        <h5 className="font-medium">{formatASQDomain(domain.domain)}</h5>
                        <div className="text-xs text-gray-500">
                          {domain.observations} observations • {domain.activities} activities
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className={`h-2.5 rounded-full ${
                            domain.status === 'ready' ? 'bg-green-500' : 
                            domain.status === 'in_progress' ? 'bg-blue-500' : 
                            'bg-amber-500'
                          }`} 
                          style={{ width: `${domain.progress}%` }}
                        ></div>
                      </div>
                      {getStatusIcon(domain.status)}
                    </div>
                  </div>
                  
                  {/* Expanded view when domain is selected */}
                  {selectedDomain === domain.domain && (
                    <div className="mt-3 pt-3 border-t">
                      <h6 className="font-medium mb-2">Domain-specific observations:</h6>
                      {observations.filter(obs => obs.domain === domain.domain).length > 0 ? (
                        <ul className="text-sm space-y-2">
                          {observations
                            .filter(obs => obs.domain === domain.domain)
                            .map(obs => (
                              <li key={obs.id} className="border-l-2 border-blue-300 pl-3 py-1">
                                <div className="font-medium">{obs.skillName}</div>
                                <div className="text-gray-600">{obs.text}</div>
                                <div className="text-xs text-gray-500">
                                  {obs.date.toLocaleDateString()}
                                </div>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No observations recorded for this domain yet.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Recommended activities */}
          <div className="mb-6">
            <h4 className="text-md font-medium mb-3">Recommended Activities</h4>
            {recommendedActivities.length > 0 ? (
              <div className="space-y-3">
                {recommendedActivities.map(activity => (
                  <div 
                    key={activity.id}
                    onClick={() => handleActivitySelect(activity.id)}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <h5 className="font-medium">{activity.title}</h5>
                    {activity.description && (
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    )}
                    <div className="flex items-center mt-2">
                      {activity.area && (
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded mr-2">
                          {activity.area}
                        </span>
                      )}
                      <span className="text-xs text-blue-600 ml-auto flex items-center">
                        View details <ArrowRight className="h-3 w-3 ml-1" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 p-3 border rounded-lg">
                No activities recommended yet.
              </p>
            )}
          </div>
          
          {/* Recent observations */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-medium">Recent Observations</h4>
              <button 
                onClick={() => setShowAllObservations(!showAllObservations)}
                className="text-sm text-blue-600"
              >
                {showAllObservations ? "Show less" : "Show all"}
              </button>
            </div>
            
            {observations.length > 0 ? (
              <div className="space-y-3">
                {observations
                  .slice(0, showAllObservations ? undefined : 3)
                  .map(obs => (
                    <div key={obs.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h5 className="font-medium">{obs.skillName}</h5>
                          <p className="text-sm text-gray-600 mt-1">{obs.text}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${getDomainColor(obs.domain)}`}>
                          {formatASQDomain(obs.domain)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {obs.date.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 p-3 border rounded-lg">
                No observations recorded yet.
              </p>
            )}
          </div>
          
          {/* ASQ Questionnaire Preview Popup */}
          {showAsqPopup && nextVisit?.visitType && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b p-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    ASQ Preview for {nextVisit.visitType} Visit
                  </h2>
                  <button 
                    onClick={() => setShowAsqPopup(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="p-4">
                  {(() => {
                    const asqData = getAsqQuestionnaire(nextVisit.visitType);
                    return (
                      <>
                        <div className="mb-4">
                          <h3 className="font-medium text-gray-900">{asqData.title}</h3>
                          <p className="text-sm text-gray-600">{asqData.description}</p>
                        </div>
                        
                        <div className="space-y-4">
                          {Object.entries(asqData.questions).map(([domain, questions]) => (
                            <div key={domain} className="p-3 border rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`inline-block p-1 rounded ${domainColors[domain as ASQDomain]}`}>
                                  {domainIcons[domain as ASQDomain]}
                                </span>
                                <h4 className="font-medium">{formatASQDomain(domain as ASQDomain)}</h4>
                              </div>
                              
                              <ul className="space-y-2 text-sm">
                                {questions.map((question, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-gray-500 mr-2">•</span>
                                    <span>{question}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-6 text-sm text-gray-600">
                          <p>
                            This is a preview of some sample questions from the ASQ-3 questionnaire.
                            Your pediatrician may use a similar but different questionnaire during the actual visit.
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                <div className="border-t p-4 flex justify-end">
                  <button
                    onClick={() => setShowAsqPopup(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 