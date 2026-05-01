'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { Baby, User, Heart, UserCircle } from 'lucide-react';
import { QuestionnaireType } from '@/lib/questionnaire-data';

interface CategoryCardProps {
  type: QuestionnaireType;
  title: string;
  description: string;
}

const icons: Record<QuestionnaireType, React.ReactNode> = {
  infant: <Baby className="w-8 h-8" />,
  child: <User className="w-8 h-8" />,
  woman: <Heart className="w-8 h-8" />,
  man: <UserCircle className="w-8 h-8" />,
};

const colors: Record<QuestionnaireType, string> = {
  infant: 'bg-primary-50 text-primary-600',
  child: 'bg-medical-50 text-medical-600',
  woman: 'bg-accent-50 text-accent-600',
  man: 'bg-success-50 text-success-600',
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ type, title, description }) => {
  const { language } = useLanguage();

  return (
    <Link
      href={`/anketa?type=${type}&lang=${language}`}
      className="category-card group flex flex-col items-center text-center p-8"
    >
      <div className={`w-16 h-16 rounded-lg ${colors[type]} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-200`}>
        {icons[type]}
      </div>
      <h3 className="text-lg font-semibold text-medical-800 mb-2">{title}</h3>
      <p className="text-sm text-medical-600">{description}</p>
    </Link>
  );
};
