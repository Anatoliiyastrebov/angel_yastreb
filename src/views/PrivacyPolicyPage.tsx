'use client';

import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRIVACY_SECTIONS } from '@/lib/legal/privacy-policy-content';

const PrivacyPolicyPage: React.FC = () => {
  const { language } = useLanguage();
  const sections = PRIVACY_SECTIONS[language];

  const ui =
    language === 'ru'
      ? {
          title: 'Политика конфиденциальности',
          backToHome: 'Вернуться на главную',
          note: 'Краткая версия также доступна из формы анкеты перед отправкой.',
        }
      : language === 'de'
        ? {
            title: 'Datenschutzerklärung',
            backToHome: 'Zurück zur Startseite',
            note: 'Eine Kurzfassung ist auch im Fragebogen vor dem Absenden verfügbar.',
          }
        : {
            title: 'Privacy Policy',
            backToHome: 'Back to home',
            note: 'A shorter version is also available from the questionnaire before you submit.',
          };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <Link
            href={`/?lang=${language}`}
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Home className="w-4 h-4" />
            {ui.backToHome}
          </Link>
        </div>

        <div className="card-wellness space-y-6">
          <h1 className="text-3xl font-bold text-foreground">{ui.title}</h1>
          <p className="text-sm text-muted-foreground">{ui.note}</p>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <section key={index} className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
