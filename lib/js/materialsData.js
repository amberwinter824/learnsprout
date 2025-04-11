"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonHouseholdItems = exports.essentialStarterKit = void 0;
exports.isCommonHouseholdItem = isCommonHouseholdItem;
exports.getHouseholdAlternative = getHouseholdAlternative;
exports.getEssentialStarterKit = getEssentialStarterKit;
exports.userHasMontessoriKit = userHasMontessoriKit;
exports.getHouseholdOnlyActivities = getHouseholdOnlyActivities;
exports.getSuggestedUpgradeMaterials = getSuggestedUpgradeMaterials;
var firebase_1 = require("./firebase");
var firestore_1 = require("firebase/firestore");
// Full essential starter kit definition with detailed information
exports.essentialStarterKit = [
    {
        id: 'work-mat',
        name: 'Work Mat',
        description: 'Defines the child\'s workspace and helps them understand boundaries while working on activities.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'A clean placemat, small rug, or towel',
        amazonLink: 'https://amzn.to/4izC16E',
        category: 'Practical Life',
        priority: 1,
        activityCount: 13
    },
    {
        id: 'small-tray',
        name: 'Small Tray',
        description: 'Used for organizing materials and defining activities. Teaches order and sequence.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Small baking trays or plastic serving trays',
        amazonLink: 'https://amzn.to/4bSuE7W',
        category: 'Practical Life',
        priority: 2,
        activityCount: 6
    },
    {
        id: 'animal-cards',
        name: 'Animal Picture Cards',
        description: 'Used for language development, classification, and matching activities.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Pictures of animals from magazines or printed photos, or small animal figurines',
        category: 'Language',
        priority: 3,
        activityCount: 2
    },
    {
        id: 'color-tablets',
        name: 'Color Tablets',
        description: 'Used for color recognition, matching, and grading activities.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Paint color swatches or colored paper squares',
        amazonLink: 'https://amzn.to/41CZ9u3',
        category: 'Sensorial',
        priority: 4,
        activityCount: 2
    },
    {
        id: 'object-permanence-box',
        name: 'Object Permanence Box',
        description: 'Helps develop understanding that objects continue to exist even when they cannot be seen.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Small box with a hole in the top and small balls or objects that fit through',
        category: 'Sensorial',
        priority: 5,
        activityCount: 1
    },
    {
        id: 'simple-knobbed-puzzles',
        name: 'Simple Knobbed Puzzles',
        description: 'Develops fine motor skills, hand-eye coordination, and shape recognition.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Simple puzzles made from cardboard with bottle caps as knobs',
        amazonLink: 'https://amzn.to/3ReHF2a',
        category: 'Sensorial',
        priority: 6,
        activityCount: 1
    },
    {
        id: 'three-part-cards',
        name: 'Three-Part Cards',
        description: 'Used for vocabulary development, reading preparation, and classification.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Handmade cards with pictures and labels using cardstock',
        category: 'Language',
        priority: 7,
        activityCount: 2
    },
    {
        id: 'season-cards',
        name: 'Season Cards',
        description: 'Used for learning about seasons, weather, and time concepts.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Pictures from magazines or handmade cards showing seasonal changes',
        category: 'Culture',
        priority: 8,
        activityCount: 1
    },
    {
        id: 'plant-cards',
        name: 'Parts of a Plant Cards',
        description: 'Used for learning plant anatomy and classification.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Handmade cards with plant parts labeled, or real plants for observation',
        category: 'Biology',
        priority: 9,
        activityCount: 1
    },
    {
        id: 'number-cards',
        name: 'Number Cards 1-10',
        description: 'Cards for learning number recognition, sequence, and quantity association.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Hand-drawn number cards on index cards',
        amazonLink: 'https://amzn.to/41ziT1J',
        category: 'Mathematics',
        priority: 10,
        activityCount: 3
    },
    {
        id: 'continent-map',
        name: 'Continent Puzzle Map',
        description: 'Introduces geography and develops spatial awareness.',
        materialType: 'basic',
        isEssential: false,
        householdAlternative: 'Printed or drawn continent shapes that can be cut out and used as puzzles',
        category: 'Geography',
        priority: 11,
        activityCount: 1
    },
    {
        id: 'shape-sorter',
        name: 'Shape Sorter',
        description: 'Develops shape recognition and fine motor skills.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Box with cut-out shapes and corresponding wooden or cardboard shapes',
        category: 'Sensorial',
        priority: 12,
        activityCount: 1
    },
    {
        id: 'matching-pairs',
        name: 'Matching Pairs',
        description: 'Used for visual discrimination and memory development.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Pairs of identical small objects or picture cards',
        category: 'Sensorial',
        priority: 13,
        activityCount: 2
    },
    {
        id: 'coin-box',
        name: 'Coin Slot Box',
        description: 'Develops fine motor skills and hand-eye coordination.',
        materialType: 'basic',
        isEssential: true,
        householdAlternative: 'Container with a slot cut in the lid and flat objects to insert',
        category: 'Practical Life',
        priority: 14,
        activityCount: 1
    }
];
// Household items that most people already have
exports.commonHouseholdItems = [
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
/**
 * Check if material is a common household item
 */
function isCommonHouseholdItem(materialName) {
    var normalizedName = materialName.trim().toLowerCase();
    return exports.commonHouseholdItems.some(function (item) { return normalizedName.includes(item.toLowerCase()); });
}
/**
 * Get household alternative for a Montessori material
 */
function getHouseholdAlternative(materialName) {
    // Check starter kit first
    var material = exports.essentialStarterKit.find(function (m) {
        return materialName.toLowerCase().includes(m.name.toLowerCase());
    });
    if (material && material.householdAlternative) {
        return material.householdAlternative;
    }
    // More comprehensive list of alternatives
    var alternatives = {
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
        'dressing frames': 'Fabric pieces with various fastenings attached',
        'metal insets': 'Simple shape stencils'
    };
    var normalizedName = materialName.toLowerCase();
    for (var _i = 0, _a = Object.entries(alternatives); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (normalizedName.includes(key.toLowerCase())) {
            return value;
        }
    }
    return 'Can be made with common household items';
}
/**
 * Fetch essential starter kit from Firestore
 */
function getEssentialStarterKit() {
    return __awaiter(this, void 0, void 0, function () {
        var materialsRef, materialsSnapshot, allMaterials, dbEssentialMaterials, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    materialsRef = (0, firestore_1.collection)(firebase_1.db, 'materials');
                    return [4 /*yield*/, (0, firestore_1.getDocs)(materialsRef)];
                case 1:
                    materialsSnapshot = _a.sent();
                    allMaterials = materialsSnapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); });
                    dbEssentialMaterials = allMaterials
                        .filter(function (material) { return material.isEssential === true; })
                        .map(function (material) { return ({
                        id: material.id,
                        name: material.name,
                        description: material.description || '',
                        materialType: material.materialType || 'basic',
                        isEssential: true,
                        householdAlternative: material.householdAlternative || getHouseholdAlternative(material.name),
                        amazonLink: material.amazonLink || '',
                        affiliateLink: material.affiliateLink || '',
                        category: material.category || 'Other',
                        priority: material.priority || 999,
                        imageUrl: material.imageUrl || '',
                        activityCount: material.activityCount || 0,
                        activities: material.activities || []
                    }); });
                    // If we have DB materials, return them sorted by priority
                    if (dbEssentialMaterials.length > 0) {
                        return [2 /*return*/, dbEssentialMaterials.sort(function (a, b) { return a.priority - b.priority; })];
                    }
                    // Otherwise return our hardcoded list
                    return [2 /*return*/, exports.essentialStarterKit];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error getting essential starter kit:', error_1);
                    return [2 /*return*/, exports.essentialStarterKit]; // Fallback to hardcoded list
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if user has Montessori kit (either purchased or marked several essential materials as owned)
 */
function userHasMontessoriKit(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var userDoc, essentialMaterials_1, userMaterialsQuery, materialSnapshot, ownedEssentialCount_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'users', userId))];
                case 1:
                    userDoc = _a.sent();
                    if (userDoc.exists() && userDoc.data().hasMontessoriKit) {
                        return [2 /*return*/, true];
                    }
                    essentialMaterials_1 = exports.essentialStarterKit.map(function (m) { return m.id; });
                    userMaterialsQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'userMaterials'), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.where)('isOwned', '==', true));
                    return [4 /*yield*/, (0, firestore_1.getDocs)(userMaterialsQuery)];
                case 2:
                    materialSnapshot = _a.sent();
                    ownedEssentialCount_1 = 0;
                    materialSnapshot.forEach(function (doc) {
                        var materialId = doc.data().materialId;
                        if (essentialMaterials_1.includes(materialId)) {
                            ownedEssentialCount_1++;
                        }
                    });
                    // If they own more than 30% of essential materials, consider them to have a kit
                    return [2 /*return*/, ownedEssentialCount_1 >= Math.ceil(essentialMaterials_1.length * 0.3)];
                case 3:
                    error_2 = _a.sent();
                    console.error('Error checking if user has Montessori kit:', error_2);
                    return [2 /*return*/, false]; // Default to false on error
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get activities that can be completed with only household items
 */
function getHouseholdOnlyActivities() {
    return __awaiter(this, void 0, void 0, function () {
        var activitiesRef, activitiesSnapshot, householdActivityIds_1, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    activitiesRef = (0, firestore_1.collection)(firebase_1.db, 'activities');
                    return [4 /*yield*/, (0, firestore_1.getDocs)(activitiesRef)];
                case 1:
                    activitiesSnapshot = _a.sent();
                    householdActivityIds_1 = [];
                    activitiesSnapshot.forEach(function (doc) {
                        var activity = doc.data();
                        // If no materials needed or all are household items
                        if (!activity.materialsNeeded || !Array.isArray(activity.materialsNeeded) ||
                            activity.materialsNeeded.length === 0 ||
                            activity.materialsNeeded.every(function (material) { return isCommonHouseholdItem(material); })) {
                            householdActivityIds_1.push(doc.id);
                        }
                    });
                    return [2 /*return*/, householdActivityIds_1];
                case 2:
                    error_3 = _a.sent();
                    console.error('Error getting household-only activities:', error_3);
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Get suggested materials for upgrade based on activities completed
 */
function getSuggestedUpgradeMaterials(userId, childId, activitiesCompleted) {
    return __awaiter(this, void 0, void 0, function () {
        var hasKit, kitMaterials, userMaterialsQuery, userMaterialsSnapshot, ownedMaterialIds_1, neededMaterials, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, userHasMontessoriKit(userId)];
                case 1:
                    hasKit = _a.sent();
                    if (hasKit) {
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, getEssentialStarterKit()];
                case 2:
                    kitMaterials = _a.sent();
                    userMaterialsQuery = (0, firestore_1.query)((0, firestore_1.collection)(firebase_1.db, 'userMaterials'), (0, firestore_1.where)('userId', '==', userId), (0, firestore_1.where)('isOwned', '==', true));
                    return [4 /*yield*/, (0, firestore_1.getDocs)(userMaterialsQuery)];
                case 3:
                    userMaterialsSnapshot = _a.sent();
                    ownedMaterialIds_1 = new Set();
                    userMaterialsSnapshot.forEach(function (doc) {
                        ownedMaterialIds_1.add(doc.data().materialId);
                    });
                    neededMaterials = kitMaterials.filter(function (material) {
                        return !ownedMaterialIds_1.has(material.id);
                    });
                    // Based on activities completed, recommend a subset
                    if (activitiesCompleted >= 5 && activitiesCompleted < 15) {
                        // Basic starter - first 4-5 items
                        return [2 /*return*/, neededMaterials.slice(0, 5)];
                    }
                    else if (activitiesCompleted >= 15) {
                        // Complete kit recommendation
                        return [2 /*return*/, neededMaterials];
                    }
                    // Not enough activities completed yet
                    return [2 /*return*/, []];
                case 4:
                    error_4 = _a.sent();
                    console.error('Error getting suggested materials:', error_4);
                    return [2 /*return*/, []];
                case 5: return [2 /*return*/];
            }
        });
    });
}
