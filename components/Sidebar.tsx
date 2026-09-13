'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useTaskStore } from '@/store/taskStore';
import {
  formatTaskReminderSummary,
  getTaskReminderCandidates,
  getTaskReminderKey,
  getTasksDueTodayOrOverdueCount,
} from '@/lib/taskNotifications';
import type { Profile } from '@/types/rbac';

const BASE_NAV = [
  {
    name: 'Enquiries',
    href: '/enquiries',
    roles: ['super_admin', 'team_member'] as string[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Tasks',
    href: '/tasks',
    roles: ['super_admin', 'team_member'] as string[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-6H4a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Projects',
    href: '/projects',
    roles: ['super_admin', 'team_member'] as string[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Team',
    href: '/team',
    roles: ['super_admin'] as string[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    href: '/settings',
    roles: ['super_admin', 'team_member'] as string[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  team_member: 'Team Member',
  client: 'Client',
};

export default function Sidebar() {
  const pathname = usePathname();
  const tasks = useTaskStore((state) => state.tasks);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const notifiedReminderKeysRef = useRef<Set<string>>(new Set());
  const [profile, setProfile] = useState<Profile | null>(null);

  // Load profile from Supabase
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data as Profile);
    };
    load();
  }, []);

  const dueTodayOrOverdueCount = useMemo(
    () => getTasksDueTodayOrOverdueCount(tasks, currentTime),
    [currentTime, tasks]
  );

  useEffect(() => {
    const syncTaskReminders = () => {
      const reminderCandidates = getTaskReminderCandidates(tasks, currentTime);
      const candidateKeys = new Set(reminderCandidates.map((task) => getTaskReminderKey(task)));

      notifiedReminderKeysRef.current.forEach((key) => {
        if (!candidateKeys.has(key)) {
          notifiedReminderKeysRef.current.delete(key);
        }
      });

      const newReminders = reminderCandidates.filter((task) => {
        const key = getTaskReminderKey(task);
        if (notifiedReminderKeysRef.current.has(key)) {
          return false;
        }
        notifiedReminderKeysRef.current.add(key);
        return true;
      });

      if (newReminders.length === 0) return;

      const overdueCount = newReminders.filter((task) => new Date(task.dueDate).getTime() < Date.now()).length;
      const dueSoonCount = newReminders.length - overdueCount;
      const summary = formatTaskReminderSummary(newReminders);

      toast(
        overdueCount > 0 && dueSoonCount > 0
          ? `${overdueCount} overdue and ${dueSoonCount} due soon: ${summary}`
          : overdueCount > 0
            ? `${overdueCount} task${overdueCount === 1 ? '' : 's'} overdue: ${summary}`
            : `${dueSoonCount} task${dueSoonCount === 1 ? '' : 's'} due within the next hour: ${summary}`,
        { icon: '!' }
      );
    };

    syncTaskReminders();
    const intervalId = window.setInterval(syncTaskReminders, 60_000);
    return () => window.clearInterval(intervalId);
  }, [currentTime, tasks]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const role = profile?.role ?? null;
  const navigation = BASE_NAV.filter((item) => !role || item.roles.includes(role));

  return (
    <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800 text-white h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Webrocket CRM</h1>
            <p className="text-xs text-gray-400">Lead Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white font-semibold'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className={`${isActive ? 'text-white' : 'text-gray-400'}`}>
                {item.icon}
              </div>
              <span className="flex flex-1 items-center justify-between gap-3 font-medium">
                <span>{item.name}</span>
                {item.name === 'Tasks' && dueTodayOrOverdueCount > 0 && (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {dueTodayOrOverdueCount}
                  </span>
                )}
                {item.name === 'Team' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-600/30 border border-blue-500/30 rounded text-[10px] text-blue-400 font-medium">
                    Admin
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer — user info + sign out */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        {profile && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800">
            <div className="w-8 h-8 bg-blue-600/30 border border-blue-500/30 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-400">
                {(profile.full_name ?? profile.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile.full_name ?? profile.email.split('@')[0]}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </p>
            </div>
          </div>
        )}
        <button
          id="btn-sign-out"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}