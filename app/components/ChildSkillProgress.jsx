// components/ChildSkillProgress.jsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
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
            const skillDoc = await getDoc(doc(db, 'developmentalSkills', skillId));
            
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