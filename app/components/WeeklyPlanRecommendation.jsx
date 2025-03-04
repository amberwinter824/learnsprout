// components/WeeklyPlanRecommendation.jsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateWeeklyPlan } from '@/lib/planGenerator';
import { Loader2, Calendar, ArrowRight, ShieldAlert } from 'lucide-react';

export default function WeeklyPlanRecommendation({ childId, childName, userId }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGeneratePlan = async () => {
    if (!childId || !userId) {
      setError('Missing required information');
      return;
    }
    
    try {
      setIsGenerating(true);
      setError('');
      
      const plan = await generateWeeklyPlan(childId, userId);
      
      // Redirect to the weekly plan page with the new plan ID
      router.push(`/dashboard/children/${childId}/weekly-plan?planId=${plan.id}`);
    } catch (err) {
      console.error('Error generating weekly plan:', err);
      setError('Failed to generate weekly plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 flex items-center">
        <Calendar className="h-5 w-5 text-emerald-500 mr-2" />
        <h2 className="text-lg font-medium text-gray-900">Weekly Plan Recommendation</h2>
      </div>
      
      <div className="p-6">
        <p className="text-gray-600 mb-6">
          Generate a personalized weekly plan for {childName} based on their developmental needs,
          interests, and progress. The plan will include suggested activities timed throughout the week
          to support skill development.
        </p>
        
        <div className="bg-emerald-50 p-4 rounded-md flex items-start mb-6">
          <div className="mr-3 mt-1">
            <ShieldAlert className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-emerald-800 mb-1">AI-Powered Recommendations</h3>
            <p className="text-sm text-emerald-700">
              Our system analyzes {childName}'s progress on developmental skills, previous activities, and
              engagement levels to recommend the most appropriate activities for continued growth.
            </p>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Last generated: <span className="font-medium">Never</span>
          </div>
          
          <button
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Generating...
              </>
            ) : (
              <>
                Generate Weekly Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// components/ChildSkillProgress.jsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ArrowUp, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ChildSkillProgress({ childId }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchChildSkills = async () => {
      try {
        setLoading(true);
        
        // Get all skills for this child
        const skillsQuery = query(
          collection(db, 'childSkills'),
          where('childId', '==', childId)
        );
        
        const skillsSnapshot = await getDocs(skillsQuery);
        const childSkillsData = {};
        
        skillsSnapshot.forEach(doc => {
          const data = doc.data();
          childSkillsData[data.skillId] = {
            id: doc.id,
            status: data.status,
            lastAssessed: data.lastAssessed,
            notes: data.notes
          };
        });
        
        // Get the details for each skill
        const skillIds = Object.keys(childSkillsData);
        const skillDetails = [];
        
        // If no skills, fetch all skills from developmentalSkills
        if (skillIds.length === 0) {
          const allSkillsQuery = query(collection(db, 'developmentalSkills'));
          const allSkillsSnapshot = await getDocs(allSkillsQuery);
          
          allSkillsSnapshot.forEach(doc => {
            skillDetails.push({
              id: doc.id,
              name: doc.data().name,
              area: doc.data().area,
              description: doc.data().description,
              status: 'not_started',
              lastAssessed: null,
              notes: ''
            });
          });
        } else {
          // Fetch details for existing skills
          for (const skillId of skillIds) {
            const skillDoc = await db.collection('developmentalSkills').doc(skillId).get();
            
            if (skillDoc.exists()) {
              const skillData = skillDoc.data();
              skillDetails.push({
                id: skillId,
                name: skillData.name,
                area: skillData.area,
                description: skillData.description,
                status: childSkillsData[skillId].status,
                lastAssessed: childSkillsData[skillId].lastAssessed,
                notes: childSkillsData[skillId].notes
              });
            }
          }
        }
        
        // Sort skills by area and then by name
        skillDetails.sort((a, b) => {
          if (a.area !== b.area) {
            return a.area.localeCompare(b.area);
          }
          return a.name.localeCompare(b.name);
        });
        
        setSkills(skillDetails);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching child skills:', err);
        setError('Failed to load skills data');
        setLoading(false);
      }
    };
    
    if (childId) {
      fetchChildSkills();
    }
  }, [childId]);
  
  // Get color and icon for skill status
  const getStatusDisplay = (status) => {
    switch(status) {
      case 'emerging':
        return {
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          icon: <ArrowUp className="h-4 w-4" />,
          label: 'Emerging'
        };
      case 'developing':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          icon: <ArrowRight className="h-4 w-4" />,
          label: 'Developing'
        };
      case 'mastered':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: 'Mastered'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: null,
          label: 'Not Started'
        };
    }
  };
  
  // Get area color and label
  const getAreaDisplay = (area) => {
    switch(area) {
      case 'practical_life':
        return {
          color: 'text-blue-700',
          bgColor: 'bg-blue-100',
          label: 'Practical Life'
        };
      case 'sensorial':
        return {
          color: 'text-purple-700',
          bgColor: 'bg-purple-100',
          label: 'Sensorial'
        };
      case 'language':
        return {
          color: 'text-green-700',
          bgColor: 'bg-green-100',
          label: 'Language'
        };
      case 'mathematics':
        return {
          color: 'text-red-700',
          bgColor: 'bg-red-100',
          label: 'Mathematics'
        };
      case 'cultural':
        return {
          color: 'text-amber-700',
          bgColor: 'bg-amber-100',
          label: 'Cultural'
        };
      default:
        return {
          color: 'text-gray-700',
          bgColor: 'bg-gray-100',
          label: area
        };
    }
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        <p>{error}</p>
      </div>
    );
  }
  
  // Group skills by area
  const skillsByArea = skills.reduce((acc, skill) => {
    const area = skill.area || 'unknown';
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(skill);
    return acc;
  }, {});
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Developmental Skills Progress</h2>
      </div>
      
      <div className="p-6">
        {Object.entries(skillsByArea).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(skillsByArea).map(([area, areaSkills]) => {
              const areaDisplay = getAreaDisplay(area);
              
              return (
                <div key={area}>
                  <h3 className={`text-sm font-medium ${areaDisplay.color} mb-4 flex items-center`}>
                    <span className={`${areaDisplay.bgColor} px-2 py-1 rounded`}>
                      {areaDisplay.label}
                    </span>
                  </h3>
                  
                  <div className="space-y-4">
                    {areaSkills.map(skill => {
                      const statusDisplay = getStatusDisplay(skill.status);
                      
                      return (
                        <div key={skill.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{skill.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
                            </div>
                            
                            <div className={`flex items-center ${statusDisplay.color} ${statusDisplay.bgColor} px-2 py-1 rounded text-sm`}>
                              {statusDisplay.icon && <span className="mr-1">{statusDisplay.icon}</span>}
                              {statusDisplay.label}
                            </div>
                          </div>
                          
                          {skill.status !== 'not_started' && (
                            <div className="mt-3 text-xs text-gray-500 flex justify-between">
                              <span>Last assessed: {formatDate(skill.lastAssessed)}</span>
                              {skill.notes && <span className="italic">"{skill.notes}"</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p>No skills data available yet.</p>
            <p className="mt-2 text-sm">Complete activities to start tracking skill development.</p>
          </div>
        )}
      </div>
    </div>
  );
}