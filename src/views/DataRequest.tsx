'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Home, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const DataRequest: React.FC = () => {
  const { language } = useLanguage();

  const content = {
    ru: {
      title: 'Запрос данных',
      backToHome: 'Вернуться на главную',
      description:
        'Для запроса, исправления или удаления данных напишите в Telegram.',
      detailsTitle: 'Что указать в сообщении',
      details: [
        'Тема/первое сообщение: Запрос данных (GDPR)',
        'Ваше имя и фамилия',
        'Контакт, с которым заполняли анкету (email/Telegram/телефон)',
        'Что именно нужно: доступ, исправление или удаление данных',
      ],
      telegramLabel: 'Telegram для запросов:',
      telegramAction: 'Открыть Telegram',
      emailLabel: 'Электронная почта:',
      emailAction: 'Написать на почту',
      retentionNote:
        'Отправленные через сайт анкеты на сервере хранятся ограниченный срок (часто около 90 дней) с возможным автоматическим удалением; при необходимости более раннего удаления укажите это в запросе.',
    },
    en: {
      title: 'Data Request',
      backToHome: 'Back to home',
      description:
        'To request, correct, or delete your data, send a message via Telegram.',
      detailsTitle: 'What to include',
      details: [
        'First message: Data Request (GDPR)',
        'Your first and last name',
        'Contact used for the questionnaire (email/Telegram/phone)',
        'What you need: access, correction, or deletion of data',
      ],
      telegramLabel: 'Telegram for requests:',
      telegramAction: 'Open Telegram',
      emailLabel: 'Email:',
      emailAction: 'Send email',
      retentionNote:
        'Questionnaire submissions sent via this website are usually stored on the server for a limited period (often around 90 days) and may be removed automatically; ask explicitly if you need earlier deletion.',
    },
    de: {
      title: 'Datenanfrage',
      backToHome: 'Zurück zur Startseite',
      description:
        'Für Auskunft, Berichtigung oder Löschung Ihrer Daten schreiben Sie bitte über Telegram.',
      detailsTitle: 'Was in der Nachricht stehen sollte',
      details: [
        'Erste Nachricht: Datenanfrage (DSGVO)',
        'Ihr Vor- und Nachname',
        'Kontakt, mit dem Sie den Fragebogen ausgefüllt haben (E-Mail/Telegram/Telefon)',
        'Was Sie möchten: Auskunft, Berichtigung oder Löschung',
      ],
      telegramLabel: 'Telegram für Anfragen:',
      telegramAction: 'Telegram öffnen',
      emailLabel: 'E-Mail:',
      emailAction: 'E-Mail senden',
      retentionNote:
        'Über diese Website eingereichte Fragebögen werden auf dem Server in der Regel nur für einen begrenzten Zeitraum (oft etwa 90 Tage) gespeichert und können danach automatisch gelöscht werden; bitte verlangen Sie ausdrücklich eine frühere Löschung, falls erforderlich.',
    },
  };

  const t = content[language];
  const telegramUsername = 'AngelYastreb00';
  const telegramHref = `https://t.me/${telegramUsername}`;
  const emailAddress = 'angelyastreb00@gmail.com';
  const mailtoHref = `mailto:${emailAddress}?subject=${encodeURIComponent(
    language === 'ru' ? 'Запрос данных (GDPR)' : language === 'de' ? 'Datenanfrage (DSGVO)' : 'Data Request (GDPR)'
  )}`;

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
            {t.backToHome}
          </Link>
        </div>

        <div className="card-wellness space-y-6">
          <h1 className="text-3xl font-bold text-foreground">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t.detailsTitle}</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              {t.details.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <p className="text-sm text-muted-foreground leading-relaxed">{t.retentionNote}</p>

          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.telegramLabel}</p>
            <a href={telegramHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
              <MessageCircle className="w-4 h-4" />
              @{telegramUsername}
            </a>
            <div>
              <a href={telegramHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                <MessageCircle className="w-4 h-4" />
                {t.telegramAction}
              </a>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.emailLabel}</p>
            <a href={mailtoHref} className="text-primary hover:underline break-all">
              {emailAddress}
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DataRequest;
