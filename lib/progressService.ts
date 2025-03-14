// lib/progressService.ts

import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp 
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  // Interface for child skills
  interface SimpleChildSkill {
    id?: string;
    childId: string;
    skillId: string;
    notes?: string;
    status: 'not_started' | 'emerging' | 'developing' | 'mastered';
    lastAssessed?: any;
    updatedAt?: any;
  }
  
  /**
   * Get skills for a child - simplified version
   */
  export async function getSimpleChildSkills(childId: string): Promise<SimpleChildSkill[]> {
    try {
      console.log(`Fetching child skills for ID: ${childId}`);
      
      const q = query(
        collection(db, 'childSkills'),
        where('childId', '==', childId)
      );
      
      const querySnapshot = await getDocs(q);
      const skills: SimpleChildSkill[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        skills.push({
          id: doc.id,
          childId: childId,
          skillId: data.skillId || '',
          notes: data.notes || '',
          status: data.status || 'not_started',
          lastAssessed: data.lastAssessed,
          updatedAt: data.updatedAt
        });
      });
      
      console.log(`Found ${skills.length} skills for child ID: ${childId}`);
      return skills;
    } catch (error) {
      console.error(`Error fetching child skills:`, error);
      return [];
    }
  }