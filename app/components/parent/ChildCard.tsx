import React from 'react';

interface ChildCardProps {
  child: any;
  isSelected?: boolean;
  onSelect: () => void;
  onObserve: () => void;
}

export default function ChildCard({ child, isSelected, onSelect, onObserve }: ChildCardProps) {
  return (
    <div 
      className={`p-3 rounded-lg cursor-pointer ${isSelected ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-gray-200'}`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-center">
        <h3 className="font-medium">{child.name}</h3>
        <button 
          onClick={(e) => { e.stopPropagation(); onObserve(); }}
          className="text-xs text-emerald-600 hover:text-emerald-700"
        >
          Observe
        </button>
      </div>
    </div>
  );
} 