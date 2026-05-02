import React from 'react';
import {
  User,
  Droplet,
  Droplets,
  Moon,
  Pill,
  Baby,
  Calendar,
  Scale,
  Wind,
  Sparkles,
  Flower2,
  Activity,
  AlertCircle,
  AlertTriangle,
  FileText,
  Info,
  Smile,
  Shield,
  Scissors,
  Circle,
  Zap,
  Thermometer,
  Brain,
  Candy,
  Bone,
} from 'lucide-react';

import { LogoHeart } from './LogoHeart';

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  user: User,
  heart: LogoHeart,
  droplet: Droplet,
  droplets: Droplets,
  moon: Moon,
  pill: Pill,
  baby: Baby,
  calendar: Calendar,
  scale: Scale,
  wind: Wind,
  sparkles: Sparkles,
  flower: Flower2,
  activity: Activity,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'file-text': FileText,
  info: Info,
  smile: Smile,
  shield: Shield,
  scissors: Scissors,
  circle: Circle,
  zap: Zap,
  thermometer: Thermometer,
  brain: Brain,
  candy: Candy,
  bone: Bone,
};

interface SectionIconProps {
  name: string;
  className?: string;
}

export const SectionIcon: React.FC<SectionIconProps> = ({ name, className = 'section-icon' }) => {
  const IconComponent = iconMap[name] || Info;
  return <IconComponent className={className} />;
};
