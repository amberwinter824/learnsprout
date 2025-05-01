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
import { DevelopmentalSkill } from '../../../lib/types/enhancedSchema';
import { calculateAgeInMonths } from '../../../lib/ageUtils';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getRecommendedActivities } from '../../../lib/planGenerator';

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
  
  const childAgeMonths = calculateAgeInMonths(child.birthDate);
  
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
  
  const handleActivitySelect = (activityId: string) => {
    setSelectedActivityId(activityId);
    setSelectedTab('activity');
  };
  
  const handleBackToJourney = () => {
    setSelectedActivityId(null);
    setSelectedTab('journey');
  };
  
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {child.name}'s Development Journey
      </h1>
      
      <Tabs defaultValue={selectedTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="journey" className="flex items-center">
            <MapPin size={16} className="mr-2" />
            <span>Journey</span>
          </TabsTrigger>
          <TabsTrigger value="checkup" className="flex items-center">
            <Calendar size={16} className="mr-2" />
            <span>Checkup Prep</span>
          </TabsTrigger>
          {selectedActivityId ? (
            <TabsTrigger value="activity" className="flex items-center">
              <Lightbulb size={16} className="mr-2" />
              <span>Activity</span>
            </TabsTrigger>
          ) : (
            <TabsTrigger value="progress" className="flex items-center">
              <BarChart size={16} className="mr-2" />
              <span>Progress</span>
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="journey" className="mt-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-medium text-gray-900 mb-4">
              Development Through Play
            </h2>
            <p className="text-gray-600 mb-6">
              Your child is currently {childAgeMonths} months old. 
              Explore play-based activities that support their natural development.
            </p>
            
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <div className="p-4 text-red-500 text-center border border-red-200 rounded">
                {error}
              </div>
            ) : activities.length === 0 ? (
              <div className="p-4 text-gray-500 text-center border border-gray-200 rounded">
                No activities found for this age group.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activities.map(activity => (
                  <div 
                    key={activity.id}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleActivitySelect(activity.id)}
                  >
                    <div className="h-32 bg-blue-100 flex items-center justify-center">
                      {activity.imageUrl ? (
                        <img 
                          src={activity.imageUrl} 
                          alt={activity.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Lightbulb size={32} className="text-blue-600" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium">{activity.title}</h3>
                      <p className="text-sm text-gray-500">
                        {activity.area || "Supports multiple development areas"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="checkup" className="mt-2">
          <PediatricVisitPrep
            childId={child.id}
            childAge={childAgeMonths}
            onActivitySelect={handleActivitySelect}
          />
        </TabsContent>
        
        <TabsContent value="progress" className="mt-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-medium text-gray-900 mb-4">
              Development Progress
            </h2>
            <p className="text-gray-600 mb-6">
              Track your child's development journey across all domains.
            </p>
            
            {/* Placeholder for progress visualization component */}
            <div className="h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart size={48} className="mx-auto mb-2" />
                <p>Progress visualization would appear here</p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="activity" className="mt-2">
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