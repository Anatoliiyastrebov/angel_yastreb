'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export const Footer: React.FC = () => {
  const { language } = useLanguage();

  return (
    <footer className="border-t border-medical-200 bg-white mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-medical-600">
          <div>
            © {new Date().getFullYear()} {language === 'ru' ? 'Анкета по здоровью' : language === 'de' ? 'Gesundheitsfragebogen' : 'Health Questionnaire'}
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={`/data-request?lang=${language}`}
              className="hover:text-medical-800 transition-colors duration-200"
            >
              {language === 'ru' ? 'Запрос данных' : language === 'de' ? 'Datenanfrage' : 'Data Request'}
            </Link>
            <Link
              href={`/impressum?lang=${language}`}
              className="hover:text-medical-800 transition-colors duration-200"
            >
              Impressum
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

