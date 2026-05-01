'use client';

import React, { Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LanguageProvider } from '@/contexts/LanguageContext';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" />
          <Suspense fallback={null}>
            <LanguageProvider>{children}</LanguageProvider>
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
