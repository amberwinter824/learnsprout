// scripts/extractMaterials.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin if not already initialized
let app;
try {
  app = admin.app();
} catch (error) {
  // Use environment variables for Firebase Admin initialization
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

async function extractMaterialsFromActivities() {
  try {
    console.log('Starting to extract materials from activities...');
    
    // Get all activities from Firestore
    const activitiesRef = db.collection('activities');
    const snapshot = await activitiesRef.get();
    
    if (snapshot.empty) {
      console.log('No activities found in the database');
      return [];
    }
    
    console.log(`Found ${snapshot.size} activities. Extracting materials...`);
    
    // Material mapping object structure: 
    // { normalizedName: { name, activities: [{ id, title }], count } }
    const materialMap = {};
    
    // Process each activity
    snapshot.forEach(doc => {
      const activity = doc.data();
      const activityId = doc.id;
      const activityTitle = activity.title || 'Untitled Activity';
      
      // Check if the activity has materials
      if (activity.materialsNeeded && Array.isArray(activity.materialsNeeded)) {
        activity.materialsNeeded.forEach(material => {
          if (material) {
            // Normalize the material name
            const normalizedName = material.trim().toLowerCase();
            
            // Add to our map, maintaining the original capitalization
            if (!materialMap[normalizedName]) {
              materialMap[normalizedName] = {
                name: material.trim(), // Keep original capitalization
                activities: [{ id: activityId, title: activityTitle }],
                count: 1
              };
            } else {
              materialMap[normalizedName].count++;
              materialMap[normalizedName].activities.push({ 
                id: activityId, 
                title: activityTitle 
              });
            }
          }
        });
      }
    });
    
    // Convert map to array
    const materialList = Object.keys(materialMap).map(key => ({
      normalizedName: key,
      name: materialMap[key].name,
      activities: materialMap[key].activities,
      count: materialMap[key].count,
      amazonLink: '',  // Empty placeholders to be filled in
      affiliateLink: '' // Empty placeholders to be filled in
    }));
    
    // Sort by frequency (most common first)
    materialList.sort((a, b) => b.count - a.count);
    
    console.log(`Extracted ${materialList.length} unique materials from activities`);
    
    // Write to CSV for easy editing in spreadsheet software
    const csvPath = path.join(process.cwd(), 'materials_to_link.csv');
    const csvHeader = 'normalizedName,name,count,amazonLink,affiliateLink,activityIds\n';
    
    let csvContent = csvHeader;
    materialList.forEach(material => {
      const activityIds = material.activities.map(a => a.id).join('|');
      // Format fields for CSV, escaping quotes and commas
      const line = [
        `"${material.normalizedName.replace(/"/g, '""')}"`,
        `"${material.name.replace(/"/g, '""')}"`,
        material.count,
        '""', // Empty amazonLink
        '""', // Empty affiliateLink
        `"${activityIds}"`
      ].join(',');
      
      csvContent += line + '\n';
    });
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    console.log(`Material list written to ${csvPath}`);
    
    // Also write a JSON version for programmatic use
    const jsonPath = path.join(process.cwd(), 'materials_to_link.json');
    fs.writeFileSync(jsonPath, JSON.stringify(materialList, null, 2), 'utf8');
    console.log(`Material list written to ${jsonPath}`);
    
    return materialList;
  } catch (error) {
    console.error('Error extracting materials:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  extractMaterialsFromActivities()
    .then(() => {
      console.log('Material extraction complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to extract materials:', error);
      process.exit(1);
    });
}

module.exports = { extractMaterialsFromActivities };