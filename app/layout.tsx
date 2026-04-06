import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Thesis Tracker',
  description: 'Research thesis management for Masters in Pure Mathematics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
