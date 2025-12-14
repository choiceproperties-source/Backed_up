import { useEffect, useState } from 'react';
import { Home, Eye, CheckCircle } from 'lucide-react';

interface Activity {
  id: number;
  type: 'listed' | 'viewed' | 'rented';
  property: string;
  location: string;
  time: string;
}

const MOCK_ACTIVITIES: Activity[] = [
  { id: 1, type: 'listed', property: 'Modern 2BR Apartment', location: 'Downtown', time: '2 min ago' },
  { id: 2, type: 'viewed', property: 'Cozy Studio', location: 'Midtown', time: '5 min ago' },
  { id: 3, type: 'rented', property: 'Spacious 3BR House', location: 'Suburbs', time: '12 min ago' },
  { id: 4, type: 'listed', property: 'Luxury Penthouse', location: 'Waterfront', time: '18 min ago' },
  { id: 5, type: 'viewed', property: 'Family Home', location: 'West Side', time: '25 min ago' },
];

export function LiveActivityTicker({ className = '' }: { className?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % MOCK_ACTIVITIES.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const activity = MOCK_ACTIVITIES[currentIndex];
  const Icon = activity.type === 'listed' ? Home : activity.type === 'viewed' ? Eye : CheckCircle;
  const bgColor = activity.type === 'listed' ? 'bg-green-500/20' : activity.type === 'viewed' ? 'bg-blue-500/20' : 'bg-secondary/20';
  const iconColor = activity.type === 'listed' ? 'text-green-500' : activity.type === 'viewed' ? 'text-blue-500' : 'text-secondary';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative flex h-3 w-3" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
      </div>
      
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full ${bgColor} transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        role="status"
        aria-live="polite"
      >
        <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
        <span className="text-sm text-white">
          <span className="font-medium">{activity.property}</span>
          <span className="text-white/70"> in {activity.location}</span>
          <span className="text-white/50"> - {activity.time}</span>
        </span>
      </div>
    </div>
  );
}
