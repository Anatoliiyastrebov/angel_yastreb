import type { Metadata } from 'next';

import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Health Questionnaire',
  description: 'Wellness questionnaire — secure submission',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
