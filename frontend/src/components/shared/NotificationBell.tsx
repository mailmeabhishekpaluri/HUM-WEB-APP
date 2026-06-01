'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Notification {
  id: string; title: string; body: string; isRead: boolean; createdAt: string; type: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data);
      setUnread(countRes.data.count);
    } catch {}
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen && unread > 0) {
      await api.patch('/notifications/mark-read').catch(() => {});
      setUnread(0);
      setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    }
  }

  const typeIcon: Record<string, string> = {
    COMPLIANCE_DUE: '⚠️', COMPLIANCE_EXPIRED: '🔴', CRITICAL_INCIDENT: '🚨',
    VOLUNTEER_APPROVED: '✅', BADGE_EARNED: '🏅', CHILD_ABSENT: '📋',
    OPPORTUNITY_ASSIGNED: '📅', VISIT_LOG_ADDED: '📝',
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
          {notifications.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No notifications</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`p-3 rounded-lg border text-sm ${n.isRead ? 'bg-white' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">{typeIcon[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-xs">{n.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-slate-400 text-xs mt-1">{new Date(n.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
