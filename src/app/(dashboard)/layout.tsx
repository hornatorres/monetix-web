'use client';

import { AuthGuard } from '@/components/AuthGuard';
import { Sidebar }   from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex">
        <Sidebar />
        <main className="mx-main flex-1">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
