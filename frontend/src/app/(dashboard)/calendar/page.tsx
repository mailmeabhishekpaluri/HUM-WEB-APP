'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Video, BookOpen, Activity, Library as LibraryIcon } from 'lucide-react';
import { GRADE_LABELS, CLASS_SUBJECT_LABELS, formatDateTime, humanize, PROGRAMME_LABELS } from '@/lib/labels';

interface ClassItem {
  id: string;
  kind: 'CLASS';
  date: string;
  status: string;
  meetLink?: string | null;
  planSubmitted: boolean;
  feedbackSubmitted: boolean;
  classSection: { grade: string; subject: string };
}
interface OppItem {
  id: string;
  kind: 'OPPORTUNITY';
  title: string;
  date: string;
  location: string;
  programmeArea: string;
  meetLink?: string | null;
  attended?: boolean;
}

type Item = ClassItem | OppItem;

export default function MyCalendarPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/classes/schedule/me').then(r => r.data).catch(() => []),
      // Volunteers always have a profile; non-volunteer roles will have no
      // registrations and the endpoint may not apply — guarded with catch.
      api.get('/volunteers/me').then(r => r.data?.eventRegistrations ?? []).catch(() => []),
    ]).then(([classes, regs]) => {
      if (!active) return;
      const classItems: ClassItem[] = (classes || []).map((s: any) => ({
        id: s.id, kind: 'CLASS',
        date: s.date, status: s.status,
        meetLink: s.meetLink,
        planSubmitted: !!s.planSubmitted,
        feedbackSubmitted: !!s.feedbackSubmitted,
        classSection: s.classSection,
      }));
      const oppItems: OppItem[] = (regs || []).map((r: any) => ({
        id: r.opportunity.id, kind: 'OPPORTUNITY',
        title: r.opportunity.title,
        date: r.opportunity.dateTime,
        location: r.opportunity.location,
        programmeArea: r.opportunity.programmeArea,
        meetLink: r.opportunity.meetLink,
        attended: r.attended,
      }));
      const merged = [...classItems, ...oppItems]
        .filter(i => new Date(i.date) > new Date(Date.now() - 12 * 60 * 60 * 1000))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setItems(merged);
    }).catch(() => toast.error('Failed to load calendar'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-[#3191c2]" />My Calendar
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {user?.role === 'VOLUNTEER' ? 'Your upcoming classes and sessions.' : 'All upcoming sessions across the foundation.'}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : items.length === 0 ? (
        <p className="text-slate-400 italic">Nothing on your calendar.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={`${item.kind}-${item.id}`}>
              <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    {item.kind === 'CLASS' ? (
                      <BookOpen className="w-4 h-4 text-[#3191c2]" />
                    ) : item.programmeArea === 'P5_LIBRARY' ? (
                      <LibraryIcon className="w-4 h-4 text-[#3191c2]" />
                    ) : (
                      <Activity className="w-4 h-4 text-[#3191c2]" />
                    )}
                    <p className="font-semibold">
                      {item.kind === 'CLASS'
                        ? `${GRADE_LABELS[item.classSection.grade] ?? humanize(item.classSection.grade)} · ${CLASS_SUBJECT_LABELS[item.classSection.subject] ?? humanize(item.classSection.subject)}`
                        : item.title}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500">{formatDateTime(item.date)}</p>
                  {item.kind === 'OPPORTUNITY' && (
                    <p className="text-xs text-slate-500">
                      {PROGRAMME_LABELS[item.programmeArea] ?? humanize(item.programmeArea)} · {item.location}
                    </p>
                  )}
                  {item.kind === 'CLASS' && (
                    <div className="flex gap-1.5 pt-1">
                      {!item.planSubmitted && <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs">Plan pending</Badge>}
                      {!item.feedbackSubmitted && <Badge variant="outline" className="border-amber-300 text-amber-600 text-xs">Feedback pending</Badge>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.meetLink && (
                    <a href={item.meetLink} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]"><Video className="w-3.5 h-3.5 mr-1.5" />Join</Button>
                    </a>
                  )}
                  <Link href={item.kind === 'CLASS' ? `/classes/sessions/${item.id}` : `/opportunities/${item.id}`}>
                    <Button size="sm" variant="outline">Open</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
