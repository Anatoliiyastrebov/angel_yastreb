export type PrivacySection = { title: string; content: string };

export const PRIVACY_SECTIONS: Record<'ru' | 'en' | 'de', PrivacySection[]> = {
  ru: [
    {
      title: 'Контролер данных',
      content:
        'Контролером данных является оператор данного сайта. Для запросов по обработке данных используйте контактные данные, указанные в Impressum, а также страницу «Запрос данных».',
    },
    {
      title: 'Правовая основа обработки',
      content:
        'Обработка персональных данных осуществляется на основании вашего добровольного согласия (ст. 6 п. 1 лит. a GDPR). Вы можете в любое время отозвать свое согласие.',
    },
    {
      title: 'Какие данные мы собираем',
      content:
        'Мы собираем только данные, которые вы добровольно предоставляете: ответы анкеты, контактные данные (включая email/Telegram/Instagram и при необходимости телефон) и технические данные, необходимые для работы сайта.',
    },
    {
      title: 'Зачем мы собираем данные',
      content:
        'Данные используются для обработки запроса, обратной связи и предоставления информационных материалов. Данные не применяются для автоматизированного принятия решений или профилирования.',
    },
    {
      title: 'Хостинг и обработка у поставщиков',
      content:
        'Для работы сайта используются инфраструктура Vercel (хостинг веб-приложения) и Supabase (база данных и при необходимости защищённое файловое хранилище вложений). Соответствующие поставщики обрабатывают данные в рамках своих соглашений и политик конфиденциальности.',
    },
    {
      title: 'Куда отправляются данные',
      content:
        'Передача данных третьим лицам осуществляется только при технической необходимости (например, хостинг или каналы связи). Если используется Telegram, обработка осуществляется в рамках политики конфиденциальности Telegram.',
    },
    {
      title: 'Как долго хранятся данные',
      content:
        'Данные хранятся только столько, сколько необходимо для целей обработки, либо до отзыва согласия или законного требования удаления. Отправленные через сайт анкеты на сервере обычно хранятся ограниченный срок (по умолчанию до 90 дней) с возможностью автоматического удаления по истечении срока, если нет иной законной необходимости.',
    },
    {
      title: 'Ваши права',
      content:
        'В соответствии с GDPR/DSGVO вы имеете право: на доступ к вашим данным (ст. 15 GDPR), их исправление (ст. 16 GDPR), удаление (ст. 17 GDPR), ограничение обработки (ст. 18 GDPR), переносимость данных (ст. 20 GDPR) и возражение против обработки (ст. 21 GDPR). Вы можете в любое время отозвать согласие на обработку данных без влияния на законность обработки, основанную на согласии до его отзыва.',
    },
    {
      title: 'Право на подачу жалобы',
      content:
        'Вы имеете право подать жалобу в надзорный орган по защите данных, если считаете, что обработка ваших персональных данных нарушает GDPR. В Германии это Федеральный уполномоченный по защите данных и свободе информации (BfDI).',
    },
    {
      title: 'Как реализовать ваши права',
      content:
        'Для реализации ваших прав (доступ, исправление, удаление и т.д.) свяжитесь с нами через Telegram (@AngelYastreb00), по электронной почте (адрес указан в Impressum) или через страницу «Запрос данных» на этом сайте. Укажите ваше имя и дату отправки анкеты (или другие данные, позволяющие идентифицировать запись). Мы стремимся ответить в разумный срок. Юридический предел для ответа на запросы по GDPR составляет как правило один месяц (ст. 12 GDPR); при сложности запроса он может быть продлён с уведомлением.',
    },
  ],
  en: [
    {
      title: 'Data Controller',
      content:
        'The data controller is the operator of this website. For data-processing requests, please use the contact details listed in the Impressum and the “Data Request” page.',
    },
    {
      title: 'Legal Basis for Processing',
      content:
        'The processing of personal data is based on your voluntary consent (Art. 6 para. 1 lit. a GDPR). You can withdraw your consent at any time.',
    },
    {
      title: 'What data we collect',
      content:
        'We collect only data you provide voluntarily: questionnaire responses, contact details (including email/Telegram/Instagram and phone where applicable), and technical data required to operate the website.',
    },
    {
      title: 'Why we collect data',
      content:
        'Data is used to process your request, communicate with you, and provide informational content. Data is not used for automated decision-making or profiling.',
    },
    {
      title: 'Hosting and subprocessors',
      content:
        'The site relies on Vercel (application hosting) and Supabase (database and, where used, secure file storage for attachments). Those providers process data under their own terms and privacy notices.',
    },
    {
      title: 'Where data is sent',
      content:
        'Data is shared with third parties only where technically necessary (e.g., hosting or communication channels). If Telegram is used, processing is subject to Telegram’s own privacy policy.',
    },
    {
      title: 'How long data is stored',
      content:
        'Data is stored only for as long as required for the stated purposes, or until consent is withdrawn / deletion is legally required. Questionnaire submissions sent via this website are typically kept for a limited period on the server (default about 90 days) and may then be deleted automatically unless a longer retention is legally justified.',
    },
    {
      title: 'Your rights',
      content:
        'In accordance with GDPR, you have the right to: access your data (Art. 15 GDPR), correct it (Art. 16 GDPR), delete it (Art. 17 GDPR), restrict processing (Art. 18 GDPR), data portability (Art. 20 GDPR), and object to processing (Art. 21 GDPR). You can withdraw your consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.',
    },
    {
      title: 'Right to lodge a complaint',
      content:
        'You may lodge a complaint with a supervisory authority if you believe processing violates GDPR. In Germany, this is the Federal Commissioner for Data Protection and Freedom of Information (BfDI).',
    },
    {
      title: 'How to exercise your rights',
      content:
        'To exercise your rights (access, correction, deletion, etc.), contact us via Telegram (@AngelYastreb00), by email (see Impressum), or via the “Data Request” page. Include your name and the date you submitted the questionnaire (or other details that help identify your record). Under GDPR we generally respond within one month (Art. 12 GDPR); extensions are possible for complex requests with notice.',
    },
  ],
  de: [
    {
      title: 'Verantwortlicher',
      content:
        'Verantwortlich für die Datenverarbeitung ist der Betreiber dieser Website. Für Anfragen nutzen Sie bitte die im Impressum genannten Kontaktdaten sowie die Seite „Datenanfrage“.',
    },
    {
      title: 'Rechtsgrundlage der Verarbeitung',
      content:
        'Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage Ihrer freiwilligen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können Ihre Einwilligung jederzeit widerrufen.',
    },
    {
      title: 'Welche Daten wir sammeln',
      content:
        'Wir verarbeiten nur Daten, die Sie freiwillig angeben: Fragebogenangaben, Kontaktdaten (u. a. E-Mail/Telegram/Instagram sowie ggf. Telefon) sowie technisch notwendige Nutzungsdaten.',
    },
    {
      title: 'Warum wir Daten sammeln',
      content:
        'Die Daten werden zur Bearbeitung Ihrer Anfrage, zur Kommunikation und zur Bereitstellung von Informationsinhalten verwendet. Eine automatisierte Entscheidungsfindung oder ein Profiling findet nicht statt.',
    },
    {
      title: 'Hosting und Auftragsverarbeiter',
      content:
        'Zum Betrieb der Website werden Vercel (Hosting der Webanwendung) und Supabase (Datenbank und ggf. geschützter Dateispeicher für Anhänge) eingesetzt. Diese Anbieter verarbeiten Daten im Rahmen ihrer eigenen Bedingungen und Datenschutzhinweise.',
    },
    {
      title: 'Wohin Daten gesendet werden',
      content:
        'Eine Weitergabe an Dritte erfolgt nur, soweit dies technisch erforderlich ist (z. B. Hosting oder Kommunikationskanäle). Bei Nutzung von Telegram richtet sich die Verarbeitung nach den Datenschutzbestimmungen von Telegram.',
    },
    {
      title: 'Wie lange Daten gespeichert werden',
      content:
        'Daten werden nur so lange gespeichert, wie es für die genannten Zwecke erforderlich ist, oder bis eine Einwilligung widerrufen wird bzw. ein gesetzlicher Löschanspruch besteht. Über diese Website eingereichte Fragebögen werden auf dem Server in der Regel nur für einen begrenzten Zeitraum (standardmäßig etwa 90 Tage) gespeichert und können danach automatisch gelöscht werden, sofern keine längere Aufbewahrungspflicht besteht.',
    },
    {
      title: 'Ihre Rechte',
      content:
        'Gemäß DSGVO haben Sie u. a. folgende Rechte: Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) und Widerspruch (Art. 21 DSGVO). Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.',
    },
    {
      title: 'Beschwerderecht',
      content:
        'Sie können sich bei einer Datenschutz-Aufsichtsbehörde beschweren. In Deutschland ist dies u. a. der Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI).',
    },
    {
      title: 'Wie Sie Ihre Rechte ausüben können',
      content:
        'Kontaktieren Sie uns zur Ausübung Ihrer Rechte per Telegram (@AngelYastreb00), per E-Mail (siehe Impressum) oder über die Seite „Datenanfrage“. Bitte nennen Sie Ihren Namen und das Datum der Einreichung des Fragebogens (oder andere zur Zuordnung erforderliche Angaben). Nach Art. 12 DSGVO ist eine Antwort in der Regel innerhalb eines Monats vorgesehen; bei komplexen Anträgen kann diese Frist unter Hinweis verlängert werden.',
    },
  ],
};
