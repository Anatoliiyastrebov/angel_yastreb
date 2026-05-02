'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const Impressum: React.FC = () => {
  const { language } = useLanguage();

  const impressumContent = {
    ru: {
      title: 'Правовая информация',
      backToHome: 'Вернуться на главную',
      impressum: 'Правовая информация',
      accordingTo: 'Информация согласно § 5 TMG',
      liabilityTitle: 'Отказ от ответственности (Haftungsausschluss)',
      privacyTitle: 'Конфиденциальность (Datenschutz)',
      nameLabel: 'Имя и фамилия:',
      name: 'Ангелина Ястребова',
      addressLabel: 'Адрес:',
      emailLabel: 'Электронная почта:',
      responsibleLabel: 'Ответственный за содержание согласно § 18 Abs. 2 MStV:',
      country: 'Германия',
      liabilityItems: [
        'Информация на этом сайте носит исключительно общий информационный характер и не является медицинской консультацией, диагностикой или лечением.',
        'На сайте не даются обещания излечения, улучшения состояния или иных конкретных результатов.',
        'Содержание подготовлено с должной тщательностью, однако не гарантируется полнота, актуальность и точность информации.',
        'Деятельность ведется в частном, некоммерческом формате и не является медицинской практикой.',
      ],
      privacyItems: [
        'Мы обрабатываем данные, которые вы добровольно предоставляете: сведения из анкеты, контактные данные (включая e-mail), а также технические данные, необходимые для работы сайта.',
        'Цель обработки: обработка вашего запроса, коммуникация с вами и предоставление информационных материалов в частном некоммерческом формате.',
        'Данные хранятся только в объеме и сроке, необходимом для указанных целей, и защищаются организационными и техническими мерами.',
        'Ваши права по GDPR/DSGVO: доступ, исправление, удаление, ограничение обработки, переносимость данных, возражение и отзыв согласия с действием на будущее.',
        'Подробная политика конфиденциальности доступна на странице сайта «Конфиденциальность» (/privacy). Для работы сайта используются технические поставщики Vercel (хостинг приложения) и Supabase (база данных и при необходимости файловое хранилище). Запросы на доступ или удаление данных см. страницу «Запрос данных».',
      ],
    },
    en: {
      title: 'Legal Information',
      backToHome: 'Back to home',
      impressum: 'Impressum',
      accordingTo: 'Information according to § 5 TMG',
      liabilityTitle: 'Disclaimer (Haftungsausschluss)',
      privacyTitle: 'Data Protection (Datenschutz)',
      nameLabel: 'First and Last Name:',
      name: 'Angelina Iastrebova',
      addressLabel: 'Address:',
      emailLabel: 'E-Mail:',
      responsibleLabel: 'Responsible for content according to § 18 Abs. 2 MStV:',
      country: 'Germany',
      liabilityItems: [
        'The information on this website is provided for general informational purposes only and does not constitute medical advice, diagnosis, or treatment.',
        'No promises of healing, recovery, or specific outcomes are made.',
        'Content is prepared with due care; however, no guarantee is given for completeness, timeliness, or accuracy.',
        'All activities are carried out on a private, non-commercial basis and do not constitute medical practice.',
      ],
      privacyItems: [
        'We process data you provide voluntarily, including questionnaire details, contact information (including e-mail), and technical data required to operate the website.',
        'Processing purposes: handling your request, communicating with you, and providing informational content in a private non-commercial context.',
        'Data is stored only to the extent and for the period required for these purposes and protected by appropriate organizational and technical measures.',
        'Your GDPR rights include access, rectification, erasure, restriction, data portability, objection, and withdrawal of consent with future effect.',
        'A fuller privacy notice is available on the website Privacy page (/privacy). Technical providers include Vercel (application hosting) and Supabase (database and optional file storage). Use the Data Request page for access or deletion requests.',
      ],
    },
    de: {
      title: 'Impressum',
      backToHome: 'Zurück zur Startseite',
      impressum: 'Impressum',
      accordingTo: 'Angaben gemäß § 5 TMG',
      liabilityTitle: 'Haftungsausschluss',
      privacyTitle: 'Datenschutz',
      nameLabel: 'Vor- und Nachname:',
      name: 'Angelina Iastrebova',
      addressLabel: 'Adresse:',
      emailLabel: 'E-Mail:',
      responsibleLabel: 'Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV:',
      country: 'Deutschland',
      liabilityItems: [
        'Die Inhalte dieser Website dienen ausschließlich allgemeinen Informationszwecken und stellen keine medizinische Beratung, Diagnose oder Behandlung dar.',
        'Es werden keine Heilversprechen oder Zusagen bestimmter gesundheitlicher Ergebnisse abgegeben.',
        'Die Inhalte werden mit der gebotenen Sorgfalt erstellt; für Vollständigkeit, Aktualität und Richtigkeit wird jedoch keine Gewähr übernommen.',
        'Die angebotene Tätigkeit erfolgt privat und nicht gewerblich; es handelt sich nicht um die Ausübung einer Heilkunde oder ärztlichen Tätigkeit.',
      ],
      privacyItems: [
        'Verarbeitet werden nur Daten, die Sie freiwillig übermitteln, insbesondere Angaben aus Fragebögen, Kontaktdaten (einschließlich E-Mail) sowie technisch erforderliche Nutzungsdaten.',
        'Zwecke der Verarbeitung sind die Bearbeitung Ihrer Anfrage, die Kommunikation mit Ihnen und die Bereitstellung von Informationen im privaten, nichtkommerziellen Rahmen.',
        'Die Speicherung erfolgt nur so lange und in dem Umfang, wie es für diese Zwecke erforderlich ist; der Schutz erfolgt durch geeignete technische und organisatorische Maßnahmen.',
        'Ihre Rechte nach DSGVO: Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerspruch sowie Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft.',
        'Ausführliche Hinweise finden Sie in der Datenschutzerklärung (/privacy). Technisch eingesetzt werden u. a. Vercel (Hosting der Anwendung) und Supabase (Datenbank und ggf. Dateispeicher). Für Auskunfts- und Löschersuchen siehe die Seite „Datenanfrage“.',
      ],
    },
  };

  const content = impressumContent[language];

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
            {content.backToHome}
          </Link>
        </div>

        <div className="card-wellness space-y-6">
          <h1 className="text-3xl font-bold text-foreground">{content.title}</h1>
          
          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-4">{content.impressum}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {content.accordingTo}
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">{content.nameLabel}</h3>
              <p>{content.name}</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">{content.addressLabel}</h3>
              <p>
                Memelstraße 8<br />
                51371 Leverkusen<br />
                {content.country}
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">{content.emailLabel}</h3>
              <p>
                <a 
                  href="mailto:angelyastreb00@gmail.com"
                  className="text-primary hover:underline"
                >
                  angelyastreb00@gmail.com
                </a>
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">
                {content.responsibleLabel}
              </h3>
              <p>
                {content.name}<br />
                Memelstraße 8<br />
                51371 Leverkusen
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">{content.liabilityTitle}</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                {content.liabilityItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">{content.privacyTitle}</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                {content.privacyItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Impressum;

