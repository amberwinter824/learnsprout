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
import { DevelopmentalSkill } from '../../../lib/types/enhancedSchema';
import { differenceInMonths } from 'date-fns';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getRecommendedActivities, generateWeeklyPlan } from '../../../lib/planGenerator';

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

export default function DevelopmentJourneyDashboard({ child }: DevelopmentJourneyDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('journey');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
            
            {/* Replace with existing WeeklyPlanWithDayFocus component */}
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