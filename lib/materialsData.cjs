// Common household items
const commonHouseholdItems = [
  // Kitchen and Dining
  'spoon', 'fork', 'knife', 'plate', 'bowl', 'cup', 'mug', 'napkin', 'dish towel',
  'measuring cup', 'measuring spoon', 'small pitcher', 'tray', 'container',
  
  // Cleaning Supplies
  'sponge', 'spray bottle', 'broom', 'dustpan', 'mop', 'bucket', 'cleaning cloth',
  'paper towels', 'soap', 'small brush',
  
  // Art and Craft Supplies
  'paper', 'pencil', 'pen', 'marker', 'crayon', 'scissors', 'glue', 'tape',
  'paint', 'paintbrush', 'construction paper', 'cardboard', 'string', 'yarn',
  
  // Storage and Organization
  'basket', 'box', 'bag', 'jar', 'container with lid',
  
  // Personal Care
  'tissue', 'cotton ball', 'cotton swab', 'small towel',
  
  // Natural Materials
  'water', 'sand', 'soil', 'rock', 'stone', 'leaf', 'stick', 'shell',
  'seed', 'flower', 'grass', 'pinecone', 'acorn', 'feather',
  
  // Food Items
  'rice', 'dried beans', 'pasta', 'cereal', 'flour', 'salt',
  'dried herbs', 'dried spices',
  
  // Tools
  'child-safe scissors', 'tongs', 'eyedropper', 'funnel', 'scoop'
];

// Check if material is a common household item
function isCommonHouseholdItem(materialName) {
  const normalizedName = materialName.trim().toLowerCase();
  return commonHouseholdItems.some(item => normalizedName.includes(item.toLowerCase()));
}

// Get household alternative for a Montessori material
function getHouseholdAlternative(materialName) {
  // More comprehensive list of alternatives
  const alternatives = {
    'golden bead': 'Groups of beans or other small objects arranged in units, tens, hundreds',
    'number rods': 'Painted craft sticks bundled together in increasing quantities',
    'spindle box': 'A divided container with small sticks or dowels for counting',
    'pink tower': 'Stacking cubes of decreasing size (can use blocks or boxes)',
    'brown stair': 'Rectangles of decreasing width (can use cardboard)',
    'red rods': 'Rods of increasing length (can use painted craft sticks)',
    'geometric cabinet': 'Cardboard shape templates and insets',
    'binomial cube': 'A 3D puzzle made from blocks with colored paper',
    'trinomial cube': 'A more complex 3D puzzle made from blocks with colored paper',
    'cylinder blocks': 'Containers of different sizes',
    'geometric solids': 'Household objects of various 3D shapes',
    'baric tablets': 'Wood pieces of different weights',
    'thermic tablets': 'Materials with different thermal conductivity',
    'sound boxes': 'Containers with different materials inside',
    'color grading': 'Paint color swatches arranged from light to dark',
    'knobless cylinders': 'Small containers of different sizes'
  };

  // Check if we have a specific alternative
  const materialKey = Object.keys(alternatives).find(key => 
    materialName.toLowerCase().includes(key.toLowerCase())
  );

  if (materialKey) {
    return alternatives[materialKey];
  }

  // Default alternative
  return 'Similar household items that serve the same purpose';
}

module.exports = {
  isCommonHouseholdItem,
  getHouseholdAlternative
}; 