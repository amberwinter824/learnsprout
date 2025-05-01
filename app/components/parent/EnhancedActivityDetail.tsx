import React, { useState, useEffect } from 'react';
import { ChevronLeft, Calendar, Clock, Presentation, BookOpen, BarChart } from 'lucide-react';
import { DevelopmentalSkill } from '../../../lib/types/enhancedSchema';
import { ASQDomain, groupSkillsByASQDomain } from '../../../lib/types/asqTypes';
import { db } from '../../../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import ActivityObservationCard from './ActivityObservationCard';

interface EnhancedActivityDetailProps {
  activityId: string;
  childId: string;
  onBack: () => void;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  area: string;
  materialsNeeded?: string[];
  duration?: number;
  difficulty?: string;
  ageRanges?: string[];
  skillsAddressed?: string[];
  environmentType?: 'home' | 'classroom' | 'bridge';
  imageUrl?: string;
}

export default function EnhancedActivityDetail({ activityId, childId, onBack }: EnhancedActivityDetailProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [skills, setSkills] = useState<DevelopmentalSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'instructions' | 'observe'>('instructions');
  const [groupedSkills, setGroupedSkills] = useState<Record<ASQDomain, DevelopmentalSkill[]> | null>(null);
  const [nextVisit, setNextVisit] = useState<{ type: string; date: Date } | null>(null);

  useEffect(() => {
    async function fetchActivityAndSkills() {
      try {
        setLoading(true);
        
        // Fetch activity details
        const activityRef = doc(db, 'activities', activityId);
        const activitySnap = await getDoc(activityRef);
        
        if (!activitySnap.exists()) {
          throw new Error(`Activity not found: ${activityId}`);
        }

        const activityData = { 
          id: activitySnap.id, 
          ...activitySnap.data() 
        } as Activity;
        
        setActivity(activityData);
        
        // Fetch related skills
        if (activityData.skillsAddressed && activityData.skillsAddressed.length > 0) {
          // Using batched approach to handle arrays that may exceed Firestore limits
          const fetchSkillsBatched = async (skillIds: string[]) => {
            const batchSize = 10; // Firestore allows up to 10 'in' clauses
            let allSkills: DevelopmentalSkill[] = [];
            
            for (let i = 0; i < skillIds.length; i += batchSize) {
              const batch = skillIds.slice(i, i + batchSize);
              const skillsQuery = query(
                collection(db, 'developmentalSkills'),
                where('id', 'in', batch)
              );
              
              const skillsSnapshot = await getDocs(skillsQuery);
              const batchSkills = skillsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
              })) as DevelopmentalSkill[];
              
              allSkills = [...allSkills, ...batchSkills];
            }
            
            return allSkills;
          };
          
          const skillsData = await fetchSkillsBatched(activityData.skillsAddressed);
          setSkills(skillsData);
          
          // Group skills by ASQ domain
          const grouped = groupSkillsByASQDomain(skillsData);
          setGroupedSkills(grouped);
        }
        
        // Fetch next pediatric visit information
        const childRef = doc(db, 'children', childId);
        const childSnap = await getDoc(childRef);
        
        if (childSnap.exists()) {
          const childData = childSnap.data();
          if (childData.nextVisit) {
            setNextVisit({
              type: childData.nextVisit.type || 'checkup',
              date: childData.nextVisit.date.toDate()
            });
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching activity details:", err);
        setError('Failed to load activity details');
        setLoading(false);
      }
    }
    
    fetchActivityAndSkills();
  }, [activityId, childId]);

  const handleObservationRecorded = async (observationText: string, skillId: string) => {
    try {
      // Record observation in Firestore
      const childSkillRef = doc(db, 'childSkills', `${childId}_${skillId}`);
      const childSkillSnap = await getDoc(childSkillRef);
      
      if (childSkillSnap.exists()) {
        // Update existing child skill document
        await updateDoc(childSkillRef, {
          observations: arrayUnion({
            text: observationText,
            date: serverTimestamp(),
            activityId: activityId
          }),
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new child skill document with observation
        await updateDoc(childSkillRef, {
          childId,
          skillId,
          status: 'emerging',
          observations: [{
            text: observationText,
            date: serverTimestamp(),
            activityId: activityId
          }],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      // Show success message
      alert("Observation recorded successfully!");
    } catch (err) {
      console.error("Error recording observation:", err);
      alert("Failed to record observation. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <p>Loading activity details...</p>
      </div>
    );
  }

  if (error || !activity) {
    return <div className="p-4 text-red-500">{error || 'Unable to load activity'}</div>;
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      {/* Activity Header */}
      <div className="relative">
        {activity.imageUrl ? (
          <img 
            src={activity.imageUrl} 
            alt={activity.title} 
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <Presentation size={48} className="text-gray-400" />
          </div>
        )}
        
        <button 
          className="absolute top-4 left-4 p-2 bg-white rounded-full shadow-md"
          onClick={onBack}
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <h1 className="text-xl font-bold text-white">{activity.title}</h1>
        </div>
      </div>
      
      {/* Activity Meta */}
      <div className="p-4 border-b flex flex-wrap gap-3">
        {activity.duration && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock size={16} className="mr-1" />
            {activity.duration} minutes
          </div>
        )}
        {activity.ageRanges && activity.ageRanges.length > 0 && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar size={16} className="mr-1" />
            {activity.ageRanges.join(', ')} years
          </div>
        )}
        <div className="flex items-center text-sm text-gray-600">
          <BookOpen size={16} className="mr-1" />
          {activity.area}
        </div>
        {activity.difficulty && (
          <div className="flex items-center text-sm text-gray-600">
            <BarChart size={16} className="mr-1" />
            {activity.difficulty}
          </div>
        )}
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button 
          className={`flex-1 py-2 px-4 text-center ${activeTab === 'instructions' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('instructions')}
        >
          Instructions
        </button>
        <button 
          className={`flex-1 py-2 px-4 text-center ${activeTab === 'observe' ? 'border-b-2 border-blue-500 font-medium text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('observe')}
        >
          Observe Development
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'instructions' && (
          <div>
            {/* Description */}
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">Description</h2>
              <p className="text-gray-700">{activity.description}</p>
            </div>
            
            {/* Materials */}
            {activity.materialsNeeded && activity.materialsNeeded.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-2">Materials Needed</h2>
                <ul className="list-disc pl-5 text-gray-700">
                  {activity.materialsNeeded.map((material, idx) => (
                    <li key={idx}>{material}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Instructions */}
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">Instructions</h2>
              <div className="text-gray-700 whitespace-pre-line">{activity.instructions}</div>
            </div>
          </div>
        )}
        
        {activeTab === 'observe' && groupedSkills && (
          <div>
            {/* Development Context */}
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">Development Through Play</h2>
              <p className="text-gray-700 mb-4">
                This activity helps build skills across multiple developmental areas. 
                Observe your child during play using the prompts below.
              </p>
            </div>
            
            {/* Pediatric Visit Context - if next visit is coming up */}
            {nextVisit && (
              <div className="p-4 bg-blue-50 rounded-lg mb-6 border border-blue-200">
                <h3 className="font-medium text-blue-800 mb-1">
                  Preparing for {nextVisit.type} Checkup
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  Your child's next checkup is in {Math.ceil((nextVisit.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days.
                  Observations you make now will help you prepare for ASQ questionnaires.
                </p>
              </div>
            )}
            
            {/* Observation Cards for each skill */}
            <div>
              {Object.entries(groupedSkills).map(([domain, domainSkills]) => (
                domainSkills.length > 0 && (
                  <div key={domain} className="mb-6">
                    {domainSkills.map(skill => (
                      <ActivityObservationCard
                        key={skill.id}
                        skillId={skill.id}
                        skillName={skill.name}
                        asqDomain={skill.asqDomain || 'problem_solving'}
                        observationPrompts={skill.observationPrompts || []}
                        indicators={skill.indicators || []}
                        onObservationRecorded={handleObservationRecorded}
                      />
                    ))}
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 