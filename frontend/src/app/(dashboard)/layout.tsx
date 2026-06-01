'use client';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, Heart, BarChart3,
  LogOut, Menu, Home
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationBell } from '@/components/shared/NotificationBell';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF', 'VOLUNTEER'] },
  { href: '/ccis', label: 'CCIs', icon: Building2, roles: ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'] },
  { href: '/children', label: 'Children', icon: Heart, roles: ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'] },
  { href: '/volunteers', label: 'Volunteers', icon: Users, roles: ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'] },
  { href: '/opportunities', label: 'Opportunities', icon: Users, roles: ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'VOLUNTEER'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER'] },
];

interface SidebarProps {
  user: { name?: string; role?: string } | null;
  onLogout: () => void;
}

function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const allowed = navItems.filter(i => i.roles.includes(user?.role ?? ''));
  return (
    <div className="flex flex-col h-full bg-white border-r">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <div>
            <p className="font-semibold text-sm">HUManity IOP</p>
            <p className="text-xs text-muted-foreground">{user?.name}</p>
          </div>
        </div>
        <Badge variant="outline" className="mt-2 text-xs">{user?.role?.replace(/_/g, ' ')}</Badge>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {allowed.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-orange-50 text-orange-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0">
        <Sidebar user={user} onLogout={logout} />
      </aside>
      {/* Mobile header + sheet */}
      <Sheet>
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b px-4 py-3 flex items-center gap-3">
          <SheetTrigger className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-600 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <span className="font-semibold text-sm flex-1">HUManity IOP</span>
          <NotificationBell />
        </div>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar user={user} onLogout={logout} />
        </SheetContent>
      </Sheet>
      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-50 pt-14 md:pt-0 flex flex-col">
        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-end gap-2 px-6 py-3 bg-white border-b shrink-0">
          <NotificationBell />
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
