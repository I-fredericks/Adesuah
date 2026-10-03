import { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Wallet,
  Megaphone,
  UserCog,
  UserCheck,
  Settings,
  Building2,
  Bell,
  LogOut,
  GraduationCap,
  Clock,
  Banknote,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import NotificationPanel from './NotificationPanel';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'school.view', hideParent: true },
  { to: '/students', label: 'Students', icon: Users, perm: 'students.view', hideParent: true },
  { to: '/academics', label: 'Academics', icon: BookOpen, perm: 'academics.view', hideParent: true },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, perm: 'attendance.view', hideParent: true },
  { to: '/scores', label: 'Score Entry', icon: ClipboardList, perm: 'grades.enter', hideParent: true },
  { to: '/assignments', label: 'Assignments', icon: BookOpen, perm: 'grades.enter', hideParent: true },
  { to: '/corrections', label: 'Corrections', icon: ClipboardCheck, perm: 'grades.view', hideParent: false },
  { to: '/reports', label: 'Report Cards', icon: FileText, perm: 'reports.view', hideParent: true },
  { to: '/extra-classes', label: 'Extra Classes', icon: Clock, perm: 'academics.view', hideParent: true },
  { to: '/fees', label: 'Fees', icon: Wallet, perm: 'fees.view', hideParent: true },
  { to: '/salary', label: 'Salary', icon: Banknote, perm: 'school.view', hideParent: true },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, perm: 'announcements.view', hideParent: false },
  { to: '/staff-attendance', label: 'Staff Attendance', icon: UserCheck, perm: 'staff.view', hideParent: true },
  { to: '/staff', label: 'Staff', icon: UserCog, perm: 'staff.view', hideParent: true },
  { to: '/settings', label: 'Settings', icon: Settings, perm: 'school.view', hideParent: true },
  { to: '/portal', label: 'My Children', icon: Users, perm: null, parentOnly: true },
  { to: '/portal/announcements', label: 'Announcements', icon: Megaphone, perm: null, parentOnly: true },
  { to: '/platform', label: 'Platform Admin', icon: Building2, perm: null, platform: true },
];

const Avatar = ({ user, size = 'h-7 w-7', text = 'text-xs' }) =>
  user?.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`flex ${size} items-center justify-center rounded-full bg-brand-600 font-bold text-white ${text}`}>
      {(user?.name || '?').charAt(0)}
    </span>
  );

const useUnread = (open) => {
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 60000,
    enabled: !open,
  });
  return data?.unread || 0;
};

const Layout = () => {
  const { user, school, logout, can, isPlatform } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const unread = useUnread(panelOpen);

  const isParent = user?.role === 'PARENT';
  const nav = NAV.filter((item) => {
    if (item.platform) return isPlatform;
    if (item.parentOnly) return isParent;
    if (isParent) return false;
    return can(item.perm);
  });

  // Bottom nav: 4 primary items, the rest behind "More"
  const primary = nav.slice(0, 4);
  const rest = nav.slice(4);

  const doLogout = () => {
    logout();
    window.location.href = '/';
  };

  const NavLinkItem = ({ item, mobile }) => (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard' || item.to === '/portal'}
      onClick={() => {
        setSidebarOpen(false);
        setMoreOpen(false);
      }}
      className={({ isActive: active }) =>
        mobile
          ? `flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] ${active ? 'text-brand-600 font-semibold' : 'text-slate-500'}`
          : `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
      }
    >
      <item.icon className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
      {item.label}
    </NavLink>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-4">
          <GraduationCap className="h-6 w-6 text-brand-500" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Adesuah</p>
            <p className="truncate text-[11px] text-slate-400">{school?.name || user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item) => (
            <NavLinkItem key={item.to} item={item} />
          ))}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={doLogout}
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
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <GraduationCap className="h-6 w-6 text-brand-600" />
            <span className="font-bold text-slate-800">Adesuah</span>
          </div>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-slate-500 lg:flex">
            <span>Welcome back,</span>
            <span className="font-medium text-slate-700">{user?.name}</span>
            <span className="text-slate-300">·</span>
            <span className="truncate text-slate-400">{school?.name || user?.role?.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="relative rounded-full p-2 hover:bg-slate-100"
              onClick={() => setPanelOpen(true)}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <button className="rounded-full p-0.5" onClick={() => setSidebarOpen(true)} aria-label="Account menu">
              <Avatar user={user} size="h-8 w-8" />
            </button>
          </div>
        </header>

        {/* Account sheet (opened from avatar on mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div
              className="absolute right-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <Avatar user={user} size="h-11 w-11" text="text-lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-slate-400">{user?.role?.replace('_', ' ')} · {school?.name}</p>
                </div>
                <button className="ml-auto text-2xl text-slate-400" onClick={() => setSidebarOpen(false)}>×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 lg:hidden">
                {rest.map((item) => (
                  <NavLinkItem key={item.to} item={item} mobile />
                ))}
              </div>
              <div className="border-t border-slate-100 p-3">
                <button
                  onClick={doLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 py-2.5 text-sm font-medium text-red-600"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5">
          {primary.map((item) => (
            <NavLinkItem key={item.to} item={item} mobile />
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] ${moreOpen ? 'text-brand-600 font-semibold' : 'text-slate-500'}`}
          >
            {moreOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            More
          </button>
        </div>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="grid grid-cols-3 gap-2">
              {rest.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive: active }) =>
                    `flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-[11px] ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
};

export default Layout;
