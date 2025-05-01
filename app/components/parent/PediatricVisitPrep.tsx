import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, AlertCircle, ArrowRight, Activity, MessageSquare } from 'lucide-react';
import { DevelopmentalSkill, PediatricVisit, EnhancedChildSkill } from '../../../lib/types/enhancedSchema';
import { ASQDomain, formatASQDomain, PediatricVisitMonth, PEDIATRIC_VISIT_MONTHS } from '../../../lib/types/asqTypes';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

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

export default function PediatricVisitPrep({ childId, childAge, onActivitySelect }: PediatricVisitPrepProps) {
  const [loading, setLoading] = useState(true);
  const [nextVisit, setNextVisit] = useState<Partial<PediatricVisit> | null>(null);
  const [domainProgress, setDomainProgress] = useState<DomainProgress[]>([]);
  const [recommendedActivities, setRecommendedActivities] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [showAllObservations, setShowAllObservations] = useState(false);
  
  // Get the visit type based on age
  const getVisitTypeForAge = (ageMonths: number): `${PediatricVisitMonth}m` => {
    // Find next upcoming visit
    const nextVisitMonth = PEDIATRIC_VISIT_MONTHS.find(month => month > ageMonths) || 60;
    return `${nextVisitMonth}m`;
  };
  
  useEffect(() => {
    async function fetchVisitPreparation() {
      try {
        setLoading(true);
        
        // 1. Get or create pediatric visit
        let visitData: Partial<PediatricVisit> = {
          childId: childId,
          visitType: getVisitTypeForAge(childAge),
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
        const visitsQuery = query(
          collection(db, 'pediatricVisits'),
          where('childId', '==', childId),
          where('visitType', '==', visitData.visitType)
        );
        
        const visitSnapshot = await getDocs(visitsQuery);
        if (!visitSnapshot.empty) {
          visitData = { id: visitSnapshot.docs[0].id, ...visitSnapshot.docs[0].data() } as PediatricVisit;
        }
        
        setNextVisit(visitData);
        
        // 2. Fetch child's skill observations
        const childSkillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId)
        );
        
        const childSkillsSnapshot = await getDocs(childSkillsQuery);
        const childSkillsData = childSkillsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as EnhancedChildSkill[];
        
        // 3. Get skills to determine ASQ domains
        const skillIds = childSkillsData.map(cs => cs.skillId);
        let skillsData: DevelopmentalSkill[] = [];
        
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
          .flatMap(cs => (cs.observations || []).map((obs: string, idx: number) => {
            // Handle date safely - convert from Timestamp or fallback to current date
            let observationDate: Date;
            if (cs.observationDates && cs.observationDates[idx]) {
              const dateObj = cs.observationDates[idx];
              if (typeof dateObj === 'object' && dateObj !== null) {
                // Check if it's a Timestamp (has toDate method)
                if ('toDate' in dateObj && typeof dateObj.toDate === 'function') {
                  // Cast to any first to avoid TypeScript error with Timestamp
                  observationDate = (dateObj as any).toDate();
                } else if (Object.prototype.toString.call(dateObj) === '[object Date]') {
                  // It's a Date object
                  observationDate = dateObj as unknown as Date;
                } else {
                  // Unknown object type, use current date
                  observationDate = new Date();
                }
              } else if (typeof dateObj === 'string' || typeof dateObj === 'number') {
                observationDate = new Date(dateObj);
              } else {
                observationDate = new Date();
              }
            } else {
              observationDate = new Date();
            }
            
            return {
              id: `${cs.id}_${idx}`,
              text: obs,
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
        // This would be fetched based on domains that need more observations
        // Using dummy data for this example
        setRecommendedActivities([
          { id: 'act1', title: 'Building Blocks Play', domain: 'fine_motor' },
          { id: 'act2', title: 'Follow Simple Directions Game', domain: 'communication' },
          { id: 'act3', title: 'Ball Toss', domain: 'gross_motor' }
        ]);
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching visit preparation data:", err);
        setLoading(false);
      }
    }
    
    fetchVisitPreparation();
  }, [childId, childAge]);
  
  if (loading) {
    return <div className="p-4">Loading visit preparation...</div>;
  }
  
  if (!nextVisit) {
    return <div className="p-4 text-red-500">Unable to load visit information</div>;
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center mb-2">
          <Calendar className="mr-2" size={20} />
          <h2 className="text-lg font-semibold">
            Preparing for {nextVisit.visitType} Checkup
          </h2>
        </div>
        <p className="text-blue-100">
          Scheduled {nextVisit.scheduledDate ? (
            (() => {
              // Safe date handling
              const dateObj = nextVisit.scheduledDate;
              try {
                if (typeof dateObj === 'object' && dateObj !== null && 'toDate' in dateObj && typeof dateObj.toDate === 'function') {
                  // It's a Timestamp
                  return (dateObj as any).toDate().toLocaleDateString();
                } else if (Object.prototype.toString.call(dateObj) === '[object Date]') {
                  // It's a Date object
                  return (dateObj as unknown as Date).toLocaleDateString();
                } else if (typeof dateObj === 'string' || typeof dateObj === 'number') {
                  // It's a string or number
                  return new Date(dateObj).toLocaleDateString();
                } else {
                  return 'soon';
                }
              } catch (e) {
                console.error('Error formatting date:', e);
                return 'soon';
              }
            })()
          ) : 'in the coming weeks'}.
          Track observations to prepare for ASQ questionnaires.
        </p>
      </div>
      {/* ASQ Domain Progress */}
      <div className="p-4">
        <h3 className="text-md font-medium mb-3">ASQ Readiness</h3>
        <div className="space-y-3">
          {domainProgress.map(domain => (
            <div key={domain.domain} className="border rounded-lg overflow-hidden">
              <div className={`flex items-center p-3 ${domainColors[domain.domain]}`}>
                <div className="mr-3">{domainIcons[domain.domain]}</div>
                <div className="flex-1">
                  <div className="font-medium">{formatASQDomain(domain.domain)}</div>
                  <div className="text-xs">
                    {domain.observations} observations · {domain.activities} activities
                  </div>
                </div>
                <div>
                  {domain.status === 'ready' ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : domain.status === 'in_progress' ? (
                    <Activity size={20} className="text-amber-600" />
                  ) : (
                    <AlertCircle size={20} className="text-gray-400" />
                  )}
                </div>
              </div>
              <div className="bg-white">
                <div className="w-full bg-gray-200 h-1">
                  <div 
                    className={`h-1 ${
                      domain.status === 'ready' 
                        ? 'bg-green-500' 
                        : domain.status === 'in_progress' 
                          ? 'bg-amber-500'
                          : 'bg-gray-300'
                    }`}
                    style={{ width: `${domain.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recommended Activities */}
      <div className="p-4 border-t">
        <h3 className="text-md font-medium mb-3">Recommended Activities</h3>
        <div className="space-y-2">
          {recommendedActivities.map(activity => (
            <div 
              key={activity.id}
              className="p-3 border rounded-lg flex items-center hover:bg-gray-50 cursor-pointer"
              onClick={() => onActivitySelect && onActivitySelect(activity.id)}
            >
              <div className={`h-8 w-8 flex items-center justify-center rounded-full mr-3 ${domainColors[activity.domain as keyof typeof domainColors].split(' ')[0]}`}>
                <span>{domainIcons[activity.domain as keyof typeof domainIcons]}</span>
              </div>
              <div className="flex-1">
                <div className="font-medium">{activity.title}</div>
                <div className="text-xs text-gray-500">
                  For {formatASQDomain(activity.domain)}
                </div>
              </div>
              <ArrowRight size={18} className="text-gray-400" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent Observations */}
      <div className="p-4 border-t">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-medium">Recent Observations</h3>
          <button 
            className="text-sm text-blue-600"
            onClick={() => setShowAllObservations(!showAllObservations)}
          >
            {showAllObservations ? 'Show Less' : 'View All'}
          </button>
        </div>
        
        {observations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 border border-dashed rounded-lg">
            <MessageSquare className="mx-auto mb-2" size={24} />
            <p>No observations recorded yet.</p>
            <p className="text-sm">Start an activity to make observations.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {observations
              .slice(0, showAllObservations ? undefined : 3)
              .map(obs => (
                <div key={obs.id} className="p-3 border rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className={`h-6 w-6 flex items-center justify-center rounded-full mr-2 ${domainColors[obs.domain as keyof typeof domainColors].split(' ')[0]}`}>
                      <span className="text-xs">{domainIcons[obs.domain as keyof typeof domainIcons]}</span>
                    </div>
                    <div className="text-sm font-medium">{obs.skillName}</div>
                    <div className="ml-auto text-xs text-gray-500">
                      {obs.date instanceof Date 
                        ? obs.date.toLocaleDateString() 
                        : typeof obs.date === 'string' || typeof obs.date === 'number'
                        ? new Date(obs.date).toLocaleDateString()
                        : 'Unknown date'}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{obs.text}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
} 