'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

/** Routes where the sidebar should NOT be shown */
const SIDEBAR_HIDDEN_PREFIXES = ['/login', '/auth', '/no-projects', '/analytics'];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = SIDEBAR_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
