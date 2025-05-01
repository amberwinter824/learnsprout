const fs = require('fs');
const path = require('path');
const csv = require('csv-parser'); // You may need to install: npm install csv-parser

// Import the ASQ domain mapping
const asqDomainMapping = {
  // Practical Life skills
  'prl-pouring': 'fine_motor',
  'prl-dressing': 'personal_social',
  'prl-food-prep': 'personal_social',
  'prl-cleaning': 'personal_social',
  'prl-coordination': 'fine_motor',
  'prl-self-care': 'personal_social',
  
  // Sensorial skills
  'sen-color': 'problem_solving',
  'sen-visual': 'problem_solving',
  'sen-tactile': 'problem_solving',
  'sen-auditory': 'problem_solving',
  'sen-spatial': 'problem_solving',
  
  // Language skills
  'lan-letter': 'communication',
  'lan-phonics': 'communication',
  'lan-vocabulary': 'communication',
  'lan-writing': 'fine_motor',
  'lan-reading': 'communication',
  'lan-comprehension': 'communication',
  
  // Mathematics skills
  'mat-counting': 'problem_solving',
  'mat-numeral': 'problem_solving',
  'mat-quantity': 'problem_solving',
  'mat-operations': 'problem_solving',
  'mat-decimal': 'problem_solving',
  'mat-measurement': 'problem_solving',
  
  // Cultural skills
  'cul-geography': 'problem_solving',
  'cul-science': 'problem_solving',
  'cul-botany': 'problem_solving',
  'cul-zoology': 'problem_solving',
  'cul-time': 'problem_solving',
  'cul-art': 'personal_social',
  'cul-music': 'personal_social',
  
  // Social-emotional skills
  'soc-self-awareness': 'personal_social',
  'soc-emotion-reg': 'personal_social',
  'soc-empathy': 'personal_social',
  'soc-relationships': 'personal_social',
  'soc-cooperation': 'personal_social',
  'soc-conflict': 'personal_social',
  'soc-independence': 'personal_social',
  'soc-boundaries': 'personal_social',
  
  // Motor skills
  'gross_motor_walking': 'gross_motor',
  'gross_motor_running': 'gross_motor',
  'fine_motor_grasp': 'fine_motor',
  
  // Language development
  'language_words': 'communication',
  'language_sentences': 'communication',
  
  // Cognitive skills
  'cognitive_object_permanence': 'problem_solving',
  'cognitive_sorting': 'problem_solving',
  
  // Social skills
  'social_parallel_play': 'personal_social',
  'social_cooperative_play': 'personal_social',
  'self_help_feeding': 'personal_social',
  'self_help_dressing': 'personal_social'
};

// Indicator templates by ASQ domain
const indicatorTemplates = {
  'communication': [
    'Uses words/gestures to express needs',
    'Responds to verbal instructions',
    'Engages in back-and-forth conversation',
    'Uses age-appropriate vocabulary',
    'Shows interest in books and stories'
  ],
  'gross_motor': [
    'Maintains balance during physical activities',
    'Coordinates large muscle movements',
    'Demonstrates control when moving body',
    'Shows appropriate strength for age',
    'Can start, stop, and change direction smoothly'
  ],
  'fine_motor': [
    'Uses precise finger and hand movements',
    'Shows hand-eye coordination',
    'Can manipulate small objects',
    'Controls tools appropriately for age',
    'Shows hand preference for detailed tasks'
  ],
  'problem_solving': [
    'Shows curiosity when exploring materials',
    'Attempts different strategies to solve problems',
    'Persists when challenged by difficult tasks',
    'Makes logical connections between concepts',
    'Applies previous knowledge to new situations'
  ],
  'personal_social': [
    'Interacts appropriately with peers',
    'Shows awareness of others\' feelings',
    'Manages emotions in challenging situations',
    'Demonstrates independence in daily activities',
    'Follows social rules and expectations'
  ]
};

// Observation prompt templates by ASQ domain
const observationPromptTemplates = {
  'communication': [
    'How does your child express wants and needs?',
    'What kinds of words does your child use regularly?',
    'How does your child respond when you ask questions?',
    'Does your child follow simple directions?',
    'Does your child show interest in books and stories?'
  ],
  'gross_motor': [
    'How does your child move around the environment?',
    'Can your child balance while walking on uneven surfaces?',
    'How does your child navigate obstacles in their path?',
    'Does your child enjoy physical activities like running or climbing?',
    'How does your child coordinate movements when playing?'
  ],
  'fine_motor': [
    'What small objects can your child pick up and manipulate?',
    'How does your child hold writing or drawing tools?',
    'Can your child stack or arrange small objects?',
    'How does your child handle buttons, zippers, or snaps on clothing?',
    'Does your child show control when using tools like scissors?'
  ],
  'problem_solving': [
    'How does your child approach new challenges?',
    'What strategies does your child use when something doesn\'t work?',
    'Does your child show persistence when facing obstacles?',
    'How does your child sort or categorize objects?',
    'Does your child connect cause and effect during play?'
  ],
  'personal_social': [
    'How does your child interact with other children?',
    'What emotions does your child express throughout the day?',
    'How does your child handle transitions or changes in routine?',
    'Does your child share toys or materials with others?',
    'How does your child respond when things don\'t go their way?'
  ]
};

// Developmental importance templates by ASQ domain
const importanceTemplates = {
  'communication': 'This skill supports language development, which is essential for expressing needs, building relationships, and later academic success. Strong communication skills enable children to connect with others and navigate social situations effectively.',
  'gross_motor': 'This skill builds the foundation for physical confidence, coordination, and healthy activity habits. Strong gross motor skills support a child\'s ability to explore their environment, engage in play, and develop overall body awareness.',
  'fine_motor': 'This skill is crucial for self-care activities, tool use, and later writing abilities. Developing fine motor control helps children gain independence in daily tasks and prepares them for academic activities that require precision.',
  'problem_solving': 'This skill fosters critical thinking, persistence, and creativity when approaching challenges. Strong problem-solving abilities help children adapt to new situations, find solutions independently, and develop confidence in their own abilities.',
  'personal_social': 'This skill enables healthy relationships, emotional regulation, and social confidence. Strong personal-social skills help children navigate group settings, develop empathy, and build the foundation for lifelong social-emotional wellness.'
};

// Function to parse age ranges (e.g., "3-4;4-5" → [{min: 36, max: 48}, {min: 48, max: 60}])
function parseAgeRanges(ageRangesStr) {
  if (!ageRangesStr) return [];
  
  return ageRangesStr.split(';').map(range => {
    const [min, max] = range.split('-').map(Number);
    return { min: min * 12, max: max * 12 }; // Convert years to months
  });
}

// Function to parse prerequisites
function parsePrerequisites(prerequisitesStr) {
  if (!prerequisitesStr) return [];
  return prerequisitesStr.split(';').filter(p => p.trim() !== '');
}

// Generate indicators based on skill and ASQ domain
function generateIndicators(skill, asqDomain) {
  const domainTemplates = indicatorTemplates[asqDomain] || indicatorTemplates['problem_solving'];
  
  // Select 2-3 templates based on skill area
  const count = Math.min(Math.floor(Math.random() * 2) + 2, domainTemplates.length);
  const selectedTemplates = [];
  
  // Ensure we don't select the same template twice
  while (selectedTemplates.length < count) {
    const idx = Math.floor(Math.random() * domainTemplates.length);
    if (!selectedTemplates.includes(domainTemplates[idx])) {
      selectedTemplates.push(domainTemplates[idx]);
    }
  }
  
  return selectedTemplates;
}

// Generate observation prompts based on skill and ASQ domain
function generateObservationPrompts(skill, asqDomain) {
  const domainTemplates = observationPromptTemplates[asqDomain] || observationPromptTemplates['problem_solving'];
  
  // Select 2-3 templates based on skill area
  const count = Math.min(Math.floor(Math.random() * 2) + 2, domainTemplates.length);
  const selectedTemplates = [];
  
  // Ensure we don't select the same template twice
  while (selectedTemplates.length < count) {
    const idx = Math.floor(Math.random() * domainTemplates.length);
    if (!selectedTemplates.includes(domainTemplates[idx])) {
      selectedTemplates.push(domainTemplates[idx]);
    }
  }
  
  return selectedTemplates;
}

// Main function to process CSV and create enhanced JSON data
function enhanceSkillsFromCSV(csvFilePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => {
        try {
          const enhancedSkills = results.map(skill => {
            // Get ASQ domain from mapping or default to problem_solving
            const asqDomain = asqDomainMapping[skill.skillId] || 'problem_solving';
            
            return {
              skillId: skill.skillId,
              skillName: skill.skillName,
              asqDomain: asqDomain,
              area: skill.area,
              description: skill.description || `Skills related to ${skill.skillName}`,
              ageRanges: parseAgeRanges(skill.ageRanges),
              prerequisites: parsePrerequisites(skill.prerequisites),
              indicators: generateIndicators(skill, asqDomain),
              observationPrompts: generateObservationPrompts(skill, asqDomain),
              developmentalImportance: importanceTemplates[asqDomain] || importanceTemplates['problem_solving']
            };
          });
          
          resolve(enhancedSkills);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Main execution
async function main() {
  try {
    console.log('Starting skill data enhancement process...');
    // Adjust this path to your CSV file location
    const csvFilePath = path.resolve(__dirname, '../developmental_skills_export.csv');
    
    console.log(`Reading skills from ${csvFilePath}...`);
    const enhancedSkills = await enhanceSkillsFromCSV(csvFilePath);
    console.log(`Enhanced ${enhancedSkills.length} skills with additional data`);
    
    // Write to JSON file
    const outputPath = path.resolve(__dirname, '../enhanced_developmental_skills.json');
    fs.writeFileSync(outputPath, JSON.stringify(enhancedSkills, null, 2));
    console.log(`Enhanced skills data written to ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error('Error enhancing skills data:', error);
    return false;
  }
}

main()
  .then(result => {
    if (result) {
      console.log('Enhancement process completed successfully');
      process.exit(0);
    } else {
      console.error('Enhancement process failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 