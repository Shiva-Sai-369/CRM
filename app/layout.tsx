import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import LayoutShell from '@/components/LayoutShell';
// SessionMonitor temporarily disabled - was causing auto-logout issues
// import SessionMonitor from '@/components/SessionMonitor';

export const metadata: Metadata = {
  title: 'Webrocket CRM - Lead Management',
  description: 'Lead enquiry management for small businesses',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* <SessionMonitor /> - Temporarily disabled */}
        <Toaster position="top-right" />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
