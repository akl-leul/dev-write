import { 
  Star, 
  Verified, 
  Trophy, 
  Crown, 
  Shield, 
  Zap, 
  Heart, 
  Sparkles, 
  Award, 
  Medal,
  Gem, 
  Rocket,
  Target,
  Flag
} from 'lucide-react';

interface ProfileBadgeProps {
  badge?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BADGE_ICONS = {
  star: Star,
  verified: Verified,
  trophy: Trophy,
  crown: Crown,
  shield: Shield,
  zap: Zap,
  heart: Heart,
  sparkles: Sparkles,
  award: Award,
  medal: Medal,
  gem: Gem, 
  rocket: Rocket,
  target: Target,
  flag: Flag,
} as const;

const BADGE_COLORS = {
  star: 'text-yellow-500 bg-yellow-50 border-yellow-200',
  verified: 'text-blue-500 bg-blue-50 border-blue-200',
  trophy: 'text-amber-500 bg-amber-50 border-amber-200',
  crown: 'text-purple-500 bg-purple-50 border-purple-200',
  shield: 'text-green-500 bg-green-50 border-green-200',
  zap: 'text-cyan-500 bg-cyan-50 border-cyan-200',
  heart: 'text-red-500 bg-red-50 border-red-200',
  sparkles: 'text-indigo-500 bg-indigo-50 border-indigo-200',
  award: 'text-orange-500 bg-orange-50 border-orange-200',
  medal: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  gem: 'text-emerald-500 bg-emerald-50 border-emerald-200',
  fire: 'text-red-600 bg-red-50 border-red-200',
  rocket: 'text-slate-600 bg-slate-50 border-slate-200',
  target: 'text-rose-500 bg-rose-50 border-rose-200',
  flag: 'text-blue-600 bg-blue-50 border-blue-200',
} as const;

const SIZE_CLASSES = {
  sm: 'w-5 h-5 p-1',
  md: 'w-6 h-6 p-1.5',
  lg: 'w-8 h-8 p-2',
} as const;

export function ProfileBadge({ badge, size = 'md', className = '' }: ProfileBadgeProps) {
  if (!badge || !BADGE_ICONS[badge as keyof typeof BADGE_ICONS]) {
    return null;
  }

  const IconComponent = BADGE_ICONS[badge as keyof typeof BADGE_ICONS];
  const colorClass = BADGE_COLORS[badge as keyof typeof BADGE_COLORS] || BADGE_COLORS.star;
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div 
      className={`rounded-full border flex items-center justify-center ${colorClass} ${sizeClass} ${className}`}
      title={`${badge.charAt(0).toUpperCase() + badge.slice(1)} Badge`}
    >
      <IconComponent className="w-full h-full" />
    </div>
  );
}
