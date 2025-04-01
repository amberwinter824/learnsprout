import { Clock } from 'lucide-react';

interface QuickActivityFilterProps {
  showQuickActivities: boolean;
  onToggle: () => void;
}

export default function QuickActivityFilter({ showQuickActivities, onToggle }: QuickActivityFilterProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center px-3 py-1.5 rounded-full text-sm transition-colors ${
        showQuickActivities
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Clock className="h-4 w-4 mr-1.5" />
      {showQuickActivities ? 'Show All Activities' : 'Quick Activities Only'}
    </button>
  );
} 