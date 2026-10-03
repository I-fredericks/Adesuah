import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  Wallet,
  Megaphone,
  UserCog,
  Settings,
  Building2,
  Bell,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'school.view' },
  { to: '/students', label: 'Students', icon: Users, perm: 'students.view' },
  { to: '/academics', label: 'Academics', icon: BookOpen, perm: 'academics.view' },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, perm: 'attendance.view' },
  { to: '/scores', label: 'Score Entry', icon: ClipboardList, perm: 'grades.enter' },
  { to: '/reports', label: 'Report Cards', icon: FileText, perm: 'reports.view' },
  { to: '/fees', label: 'Fees', icon: Wallet, perm: 'fees.view' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, perm: 'announcements.view' },
  { to: '/staff', label: 'Staff', icon: UserCog, perm: 'staff.view' },
  { to: '/settings', label: 'Settings', icon: Settings, perm: 'school.view' },
  { to: '/platform', label: 'Platform Admin', icon: Building2, perm: null, platform: true },
];

const NotificationsBell = () => {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 60000,
  });
  const unread = data?.unread || 0;

  return (
    <div className="relative">
      <Bell className="h-5 w-5 text-slate-500" />
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  );
};

const Layout = () => {
  const { user, school, logout, can, isPlatform } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = NAV.filter((item) => (item.platform ? isPlatform : can(item.perm)));

  return (
    <div className="flex min-h-screen">
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-60 transform bg-slate-900 text-slate-300 transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
          <GraduationCap className="h-6 w-6 text-brand-500" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Adesuah</p>
            <p className="truncate text-[11px] text-slate-400">{school?.name || user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <nav className="space-y-0.5 p-3">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t border-slate-800 p-3">
          <button
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="hidden min-w-0 text-sm text-slate-500 sm:block">
            Welcome back, <span className="font-medium text-slate-700">{user?.name}</span>
          </div>
          <NotificationsBell />
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
