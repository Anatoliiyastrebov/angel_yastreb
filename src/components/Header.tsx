'use client';

import React from 'react';
import Link from 'next/link';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { LogoHeart } from '@/components/icons/LogoHeart';

export const Header: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-medical-200 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href={`/?lang=${language}`}
          className="flex items-center gap-2 text-medical-800 hover:text-primary-600 transition-colors duration-200"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center border border-primary-200/80">
            <LogoHeart className="w-5 h-5 text-primary-600 shrink-0" />
          </div>
          <span className="font-semibold text-lg hidden sm:block text-medical-800">
            {t('siteTitle')}
          </span>
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
};
