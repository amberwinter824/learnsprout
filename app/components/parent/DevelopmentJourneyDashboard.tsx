import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { 
  BarChart,
  Calendar,
  Lightbulb,
  MapPin,
  Loader2
} from 'lucide-react';
import PediatricVisitPrep from './PediatricVisitPrep';
import EnhancedActivityDetail from './EnhancedActivityDetail';
import WeeklyPlanWithDayFocus from './WeeklyPlanWithDayFocus';
import { DevelopmentalSkill, EnhancedChildSkill } from '../../../lib/types/enhancedSchema';
import { formatASQDomain, ASQDomain } from '../../../lib/types/asqTypes';
import { differenceInMonths } from 'date-fns';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getRecommendedActivities, generateWeeklyPlan } from '../../../lib/planGenerator';

// Domain color scheme (consistent with other components)
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

interface Child {
  id: string;
  name: string;
  birthDate: Date;
  ageGroup: string;
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  area?: string;
  skillsAddressed?: string[];
}

interface DevelopmentJourneyDashboardProps {
  child: Child;
}

interface ObservationDisplay {
  id: string;
  text: string;
  date: Date;
  skillId: string;
  skillName: string;
  domain: ASQDomain;
}

interface DomainProgressType {
  domain: ASQDomain;
  progress: number;
  status: 'not_started' | 'in_progress' | 'ready';
}

export default function DevelopmentJourneyDashboard({ child }: DevelopmentJourneyDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('journey');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [childSkills, setChildSkills] = useState<EnhancedChildSkill[]>([]);
  const [skillData, setSkillData] = useState<DevelopmentalSkill[]>([]);
  const [domainProgress, setDomainProgress] = useState<DomainProgressType[]>([]);
  const [recentObservations, setRecentObservations] = useState<ObservationDisplay[]>([]);
  
  // Make sure we're always working with a valid Date object
  let birthDate: Date;
  try {
    if (!child.birthDate) {
      // Default to current date minus 2 years if no birthdate
      birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 2);
    } else if (child.birthDate instanceof Date) {
      birthDate = child.birthDate;
    } else if (typeof child.birthDate === 'string') {
      birthDate = new Date(child.birthDate);
    } else {
      // Try to handle Firestore Timestamp or any other object with toDate method
      try {
        // Check if it has a toDate method
        const anyBirthDate = child.birthDate as any;
        if (typeof anyBirthDate.toDate === 'function') {
          birthDate = anyBirthDate.toDate();
        } else {
          // Default fallback
          birthDate = new Date();
          birthDate.setFullYear(birthDate.getFullYear() - 2);
        }
      } catch (err) {
        console.error('Error accessing birthDate properties:', err);
        // Default fallback
        birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - 2);
      }
    }
  } catch (e) {
    console.error('Error parsing birthdate:', e);
    // Default fallback
    birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 2);
  }
  
  // Calculate child's age in months
  const childAgeMonths = differenceInMonths(new Date(), birthDate);
  
  // Fetch developmental skill data
  useEffect(() => {
    async function fetchDevelopmentData() {
      try {
        // Get child skills data
        const childSkillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', child.id)
        );
        
        const childSkillsSnapshot = await getDocs(childSkillsQuery);
        const childSkillsData = childSkillsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as EnhancedChildSkill[];
        
        setChildSkills(childSkillsData);
        
        // Get developmental skills to map to ASQ domains
        const skillIds = childSkillsData.map(cs => cs.skillId);
        let developmentalSkills: DevelopmentalSkill[] = [];
        
        if (skillIds.length > 0) {
          const batchSize = 10;
          for (let i = 0; i < skillIds.length; i += batchSize) {
            const batch = skillIds.slice(i, i + batchSize);
            const skillsQuery = query(
              collection(db, 'developmentalSkills'),
              where('id', 'in', batch)
            );
            
            const skillsSnapshot = await getDocs(skillsQuery);
            developmentalSkills = [
              ...developmentalSkills,
              ...skillsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
              })) as DevelopmentalSkill[]
            ];
          }
        }
        
        setSkillData(developmentalSkills);
        
        // Calculate domain progress based on child skills and ASQ domains
        const domains: ASQDomain[] = ['communication', 'gross_motor', 'fine_motor', 'problem_solving', 'personal_social'];
        const progress = domains.map(domain => {
          // Count skills in this domain
          const domainSkills = developmentalSkills.filter(skill => skill.asqDomain === domain);
          const domainSkillIds = domainSkills.map(skill => skill.id);
          
          // Find skills that have status of developing or mastered
          const skilledCount = childSkillsData.filter(cs => 
            domainSkillIds.includes(cs.skillId) && 
            (cs.status === 'developing' || cs.status === 'mastered')
          ).length;
          
          // Count observations for skills in this domain
          const observationsCount = childSkillsData
            .filter(cs => domainSkillIds.includes(cs.skillId) && cs.observations && cs.observations.length > 0)
            .reduce((total, cs) => total + (cs.observations?.length || 0), 0);
          
          // Calculate progress percentage - based on both skill status and observations
          const totalPossibleProgress = domainSkills.length * 2; // Full progress would be all skills mastered with observations
          const currentProgress = skilledCount + Math.min(skilledCount, observationsCount * 0.5);
          const progressPercent = totalPossibleProgress > 0 
            ? Math.min(100, Math.round((currentProgress / totalPossibleProgress) * 100))
            : 0;
          
          // Determine status
          let status: 'not_started' | 'in_progress' | 'ready' = 'not_started';
          if (progressPercent >= 80) status = 'ready';
          else if (progressPercent > 0) status = 'in_progress';
          
          return {
            domain,
            progress: progressPercent,
            status
          };
        });
        
        setDomainProgress(progress);
        
        // Get recent observations for display
        const recentObs = childSkillsData
          .filter(cs => cs.observations && cs.observations.length > 0)
          .flatMap(cs => {
            const skill = developmentalSkills.find(s => s.id === cs.skillId);
            
            return (cs.observations || []).map((obs: string, idx: number) => {
              // Get the date from observationDates if available
              const obsDate = cs.observationDates?.[idx];
              
              // Safely convert to Date - handles both Timestamp and Date objects
              let date: Date;
              if (obsDate) {
                if (typeof obsDate === 'object' && 'toDate' in obsDate && typeof obsDate.toDate === 'function') {
                  date = obsDate.toDate();
                } else if (obsDate instanceof Date) {
                  date = obsDate;
                } else {
                  date = new Date(); // fallback
                }
              } else {
                date = new Date(); // fallback
              }
              
              return {
                id: `${cs.id}_${idx}`,
                text: obs,
                date,
                skillId: cs.skillId,
                skillName: skill?.name || 'Unknown Skill',
                domain: skill?.asqDomain || 'communication'
              } as ObservationDisplay;
            });
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 3); // Get most recent observations
          
        setRecentObservations(recentObs);
        
      } catch (err) {
        console.error("Error fetching development data:", err);
      }
    }
    
    if (child.id) {
      fetchDevelopmentData();
    }
  }, [child.id]);
  
  // Fetch recommended activities for the child
  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);
        setError(null);
        
        // Get activities appropriate for the child using the recommendation engine
        try {
          // Get recommended activities for the child (limited to 6)
          const recommendations = await getRecommendedActivities(child.id, 6);
          
          if (recommendations.length > 0) {
            // Convert recommendations to activity format
            const recommendedActivities = recommendations.map(rec => ({
              id: rec.activityId,
              title: rec.activity.title,
              description: rec.activity.description,
              area: rec.activity.area,
              skillsAddressed: rec.activity.skillsAddressed,
              imageUrl: rec.activity.imageUrl,
              recommendationReason: rec.reason,
              priority: rec.priority
            }));
            
            setActivities(recommendedActivities);
            setLoading(false);
            return;
          }
          
          // Fallback: If no recommendations, query activities directly
          const activitiesQuery = query(
            collection(db, 'activities'),
            where('ageRanges', 'array-contains', child.ageGroup),
            where('status', '==', 'active'),
            orderBy('title'),
            limit(6)
          );
          
          const snapshot = await getDocs(activitiesQuery);
          const activityData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Activity[];
          
          if (activityData.length > 0) {
            setActivities(activityData);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Database access error:", err);
          throw err;
        }
      } catch (err) {
        console.error("Error fetching activities:", err);
        setError("Failed to load activities");
        setLoading(false);
      }
    }
    
    fetchActivities();
  }, [child.id, child.ageGroup]);
  
  // Handle activity selection for detailed view
  const handleActivitySelect = (activityId: string) => {
    setSelectedActivityId(activityId);
    setSelectedTab('activity');
  };
  
  // Handle back button from activity detail
  const handleBackToJourney = () => {
    setSelectedActivityId(null);
    setSelectedTab('journey');
  };

  // Handle domain click/tap
  const handleDomainClick = (domain: ASQDomain) => {
    setSelectedTab('checkup');
  };

  // Handle plan generation
  const handleGeneratePlan = async (childId: string, weekStartDate?: Date) => {
    try {
      const plan = await generateWeeklyPlan(childId, child.id, weekStartDate);
      return plan;
    } catch (error) {
      console.error("Error generating plan:", error);
      throw error;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <Tabs defaultValue={selectedTab} className="flex flex-col h-full">
        <TabsList className="grid grid-cols-3 p-0">
          <TabsTrigger value="journey" className="py-3">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Journey</span>
          </TabsTrigger>
          <TabsTrigger value="checkup">
            <BarChart className="h-4 w-4 mr-2" />
            <span>Checkup Prep</span>
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Lightbulb className="h-4 w-4 mr-2" />
            <span>Activity</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="journey" className="flex-1 p-0">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">
              Development Journey for {child.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {childAgeMonths} months old • Recommended activities for development
            </p>
            
            {/* ASQ Domain Progress */}
            {domainProgress.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Development Areas</h4>
                <div className="grid grid-cols-5 gap-2">
                  {domainProgress.map(domain => (
                    <div 
                      key={domain.domain}
                      onClick={() => handleDomainClick(domain.domain)}
                      className="p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-center"
                    >
                      <div className={`inline-flex p-2 rounded-full mb-1 ${domainColors[domain.domain as ASQDomain]}`}>
                        <span>{domainIcons[domain.domain as ASQDomain]}</span>
                      </div>
                      <div className="text-xs">
                        {formatASQDomain(domain.domain as ASQDomain)}
                      </div>
                      <div 
                        className={`text-xs font-medium mt-1 ${
                          domain.status === 'ready' ? 'text-green-600' : 
                          domain.status === 'in_progress' ? 'text-blue-600' : 
                          'text-amber-600'
                        }`}
                      >
                        {domain.status === 'ready' ? 'Ready' : 
                         domain.status === 'in_progress' ? 'In Progress' : 
                         'Not Started'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recent Observations */}
            {recentObservations.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Recent Observations</h4>
                <div className="space-y-2">
                  {recentObservations.map(obs => (
                    <div key={obs.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <h5 className="text-sm font-medium">{obs.skillName}</h5>
                          <p className="text-xs text-gray-600 mt-1">{obs.text}</p>
                        </div>
                        <span className={`px-2 h-fit py-0.5 text-xs rounded-full ${domainColors[obs.domain as ASQDomain]}`}>
                          {formatASQDomain(obs.domain as ASQDomain)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {obs.date.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Weekly Plan */}
            <WeeklyPlanWithDayFocus 
              selectedChildId={child.id}
              onGeneratePlan={handleGeneratePlan}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="checkup" className="flex-1 p-0">
          <PediatricVisitPrep 
            childId={child.id} 
            childAge={childAgeMonths} 
            onActivitySelect={handleActivitySelect}
          />
        </TabsContent>
        
        <TabsContent value="activity" className="flex-1 p-0">
          {selectedActivityId && (
            <EnhancedActivityDetail 
              activityId={selectedActivityId}
              childId={child.id}
              onBack={handleBackToJourney}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 