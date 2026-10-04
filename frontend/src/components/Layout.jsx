import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  ChevronDown,
  UserCircle,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import NotificationPanel from './NotificationPanel';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'school.view', hideParent: true, group: 'Overview' },
  { to: '/students', label: 'Students', icon: Users, perm: 'students.view', hideParent: true, group: 'School' },
  { to: '/academics', label: 'Academics', icon: BookOpen, perm: 'academics.view', hideParent: true, group: 'School' },
  { to: '/extra-classes', label: 'Extra Classes', icon: Clock, perm: 'academics.view', hideParent: true, group: 'School' },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, perm: 'attendance.view', hideParent: true, group: 'School' },
  { to: '/assignments', label: 'Assignments', icon: BookOpen, perm: 'grades.enter', hideParent: true, group: 'School' },
  { to: '/scores', label: 'Score Entry', icon: ClipboardList, perm: 'grades.enter', hideParent: true, group: 'Results' },
  { to: '/corrections', label: 'Corrections', icon: ClipboardCheck, perm: 'grades.view', hideParent: false, group: 'Results' },
  { to: '/reports', label: 'Report Cards', icon: FileText, perm: 'reports.view', hideParent: true, group: 'Results' },
  { to: '/fees', label: 'Fees', icon: Wallet, perm: 'fees.view', hideParent: true, group: 'Finance' },
  { to: '/salary', label: 'Salary', icon: Banknote, perm: 'school.view', hideParent: true, group: 'Finance' },
  { to: '/messages', label: 'Messages', icon: MessageSquare, perm: 'announcements.view', hideParent: true, group: 'Communication' },
  { to: '/messages', label: 'SMS Log', icon: MessageSquare, perm: 'announcements.view', hideParent: true, group: 'Communication' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, perm: 'announcements.view', hideParent: false, group: 'Communication' },
  { to: '/staff', label: 'Staff', icon: UserCog, perm: 'staff.view', hideParent: true, group: 'People' },
  { to: '/staff-attendance', label: 'Staff Attendance', icon: UserCheck, perm: 'staff.view', hideParent: true, group: 'People' },
  { to: '/settings', label: 'Settings', icon: Settings, perm: 'school.view', hideParent: true, group: 'System' },
  { to: '/portal', label: 'My Children', icon: Users, perm: null, parentOnly: true, group: 'Portal' },
  { to: '/portal/announcements', label: 'Announcements', icon: Megaphone, perm: null, parentOnly: true, group: 'Portal' },
  { to: '/platform', label: 'Platform Admin', icon: Building2, perm: null, platform: true, group: 'System' },
];

const GROUP_ORDER = ['Overview', 'School', 'Results', 'Finance', 'Communication', 'People', 'System', 'Portal'];

const AvatarEl = ({ user, size = 'h-8 w-8', text = 'text-xs' }) => {
  if (user?.avatarUrl) return <img src={user.avatarUrl} alt="" className={`${size} rounded-full object-cover`} />;
  const hue = ['bg-brand-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500'][ (user?.name?.charCodeAt(0) || 0) % 4 ];
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full font-semibold text-white ${hue} ${text}`}>
      {(user?.name || '?').charAt(0).toUpperCase()}
    </span>
  );
};

const Layout = () => {
  const { user, school, logout, can, isPlatform } = useAuth();
  const location = useLocation();

  const [panelOpen, setPanelOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: notif } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    refetchInterval: 60000,
  });
  const unread = notif?.unread || 0;

  const isParent = user?.role === 'PARENT';
  const nav = NAV.filter((item) => {
    if (item.platform) return isPlatform;
    if (item.parentOnly) return isParent;
    if (isParent) return false;
    return can(item.perm);
  });

  const primary = nav.slice(0, 4);
  const rest = nav.slice(4);
  const current = nav.find((n) =>
    n.to === '/dashboard' || n.to === '/portal'
      ? location.pathname === n.to
      : location.pathname.startsWith(n.to)
  );

  const doLogout = () => {
    logout();
    window.location.href = '/';
  };

  const isActive = (to) =>
    to === '/dashboard' || to === '/portal'
      ? location.pathname === to
      : location.pathname.startsWith(to);

  const SidebarInner = (
    <div className="no-print flex h-full w-full flex-col bg-navy-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_50%_at_0%_0%,rgb(29_99_237/0.18),transparent_60%)]" />
      <div className="relative px-5 pb-4 pt-5">
        <NavLink to={isParent ? '/portal' : '/dashboard'} className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 shadow-[0_4px_12px_rgb(29_99_237/0.45)]">
            <GraduationCap className="h-4 w-4" />
          </span>
          Adesuah
        </NavLink>
      </div>

      {/* School card */}
      {school && !isPlatform && (
        <div className="relative mx-3 mb-1 space-y-2.5 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold">{school.shortName || school.name}</div>
              <div className="mt-0.5 text-[11px] capitalize text-slate-400">{user?.role?.replace('_', ' ')}</div>
            </div>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${school.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-sun-400/15 text-sun-300'}`}>
              {school.plan}
            </span>
          </div>
        </div>
      )}

      {/* Grouped nav */}
      <nav className="relative flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {GROUP_ORDER.map((group) => {
          const items = nav.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{group}</p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/dashboard' || item.to === '/portal'}
                      onClick={() => {
                        setDrawerOpen(false);
                        setMoreOpen(false);
                      }}
                      aria-current={active ? 'page' : undefined}
                      className="nav-item"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User card */}
      <div className="relative border-t border-white/[0.07] p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <AvatarEl user={user} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{user?.name}</div>
            <div className="truncate text-[11px] capitalize text-slate-400">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button onClick={doLogout} title="Sign out" className="h-8 w-8 rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
            <LogOut className="mx-auto h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const NavLinkItem = ({ item, mobile }) => (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard' || item.to === '/portal'}
      onClick={() => {
        setDrawerOpen(false);
        setMoreOpen(false);
      }}
      className={({ isActive: active }) =>
        mobile
          ? `flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] ${active ? 'text-brand-600 font-semibold' : 'text-slate-500'}`
          : `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
      }
    >
      <item.icon className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
      {item.label}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop navy sidebar */}
      <div className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{SidebarInner}</div>

      {/* Mobile slide-in drawer (same sidebar) */}
      <div className={`fixed inset-0 z-50 lg:hidden ${drawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-navy-950/50 backdrop-blur-sm transition-opacity ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] transition-transform duration-200 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {SidebarInner}
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute right-3 top-4 h-8 w-8 rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <X className="mx-auto h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 pl-4 pr-4 backdrop-blur-md lg:pl-8 lg:pr-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="btn-ghost -ml-1 h-9 w-9 px-0 lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="hidden truncate text-lg font-semibold text-slate-900 md:block">
              {current?.label || 'Adesuah'}
            </h1>
            <span className="truncate text-sm text-slate-400 md:hidden">{current?.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
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
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-full p-0.5 pr-1 hover:bg-slate-100"
              >
                <AvatarEl user={user} />
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-pop">
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <p className="truncate text-sm font-semibold">{user?.name}</p>
                      <p className="truncate text-xs text-slate-400">{user?.email || user?.phone}</p>
                    </div>
                    {!isParent && (
                      <NavLink
                        to="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <UserCircle className="h-4 w-4" /> Profile & settings
                      </NavLink>
                    )}
                    {isParent && (
                      <NavLink
                        to="/portal"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Users className="h-4 w-4" /> My children
                      </NavLink>
                    )}
                    <button
                      onClick={doLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
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
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-10 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="mb-3 flex items-center gap-3 border-b border-slate-100 pb-3">
              <AvatarEl user={user} size="h-11 w-11" text="text-lg" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-slate-400">{user?.role?.replace('_', ' ')} · {school?.shortName || school?.name}</p>
              </div>
            </div>
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
            <button
              onClick={doLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-red-600"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}

      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  );
};

export default Layout;
