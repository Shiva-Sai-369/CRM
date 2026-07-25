import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import LayoutShell from '@/components/LayoutShell';

export const metadata: Metadata = {
  title: 'CRM - Lead Enquiry Management',
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
        <Toaster position="top-right" />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
