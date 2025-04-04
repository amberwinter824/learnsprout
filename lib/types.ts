export interface Material {
  id: string;
  name: string;
  description: string;
  isEssential: boolean;
  amazonLink?: string;
  imageUrl: string;
  householdAlternative: string;
  priority: number;
}

export interface EssentialMaterial extends Material {
  priority: number;
} 