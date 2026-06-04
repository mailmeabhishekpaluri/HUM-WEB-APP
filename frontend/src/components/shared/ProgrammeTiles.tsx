'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Heart, Cpu, HeartPulse, Library, BookOpen } from 'lucide-react';
import { PROGRAMME_LABELS, formatDateTime } from '@/lib/labels';

interface Tiles {
  P1_EDUCATION: { sessionsThisWeek: number; pendingPlans: number; pendingFeedback: number; openSubstitutions: number };
  P2_SEL: { upcomingSessions: number };
  P3_DIGITAL_LITERACY: { upcomingSessions: number };
  P4_HEALTH_NUTRITION: { nextCheckup: { date: string; cci?: string } | null; nextAwareness: { date: string; cci?: string } | null };
  P5_LIBRARY: { nextActivity: { date: string; cci?: string } | null; readingSnapshot: Record<string, number> };
}

const LEVEL_ORDER = ['BEGINNER', 'LETTER', 'WORD', 'PARAGRAPH', 'STORY'] as const;

export function ProgrammeTiles() {
  const [tiles, setTiles] = useState<Tiles | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/programmes')
      .then(r => setTiles(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }
  if (!tiles) return null;

  const p5snap = LEVEL_ORDER.map(l => tiles.P5_LIBRARY.readingSnapshot[l] ?? 0);
  const p5total = p5snap.reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-600">Programme summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link href="/classes">
          <Card className="hover:border-[#3191c2] transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-600">{PROGRAMME_LABELS.P1_EDUCATION}</CardTitle>
              <GraduationCap className="w-4 h-4 text-[#3191c2]" />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-bold">{tiles.P1_EDUCATION.sessionsThisWeek}</p>
              <p className="text-xs text-slate-500">classes this week</p>
              <div className="flex gap-1 flex-wrap pt-1">
                {tiles.P1_EDUCATION.pendingPlans > 0 && <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">{tiles.P1_EDUCATION.pendingPlans} plan</Badge>}
                {tiles.P1_EDUCATION.pendingFeedback > 0 && <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">{tiles.P1_EDUCATION.pendingFeedback} fb</Badge>}
                {tiles.P1_EDUCATION.openSubstitutions > 0 && <Badge variant="outline" className="text-xs border-red-300 text-red-600">{tiles.P1_EDUCATION.openSubstitutions} sub</Badge>}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/curriculum">
          <Card className="hover:border-[#3191c2] transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-600">{PROGRAMME_LABELS.P2_SEL}</CardTitle>
              <Heart className="w-4 h-4 text-[#3191c2]" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{tiles.P2_SEL.upcomingSessions}</p>
              <p className="text-xs text-slate-500">upcoming sessions</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/curriculum">
          <Card className="hover:border-[#3191c2] transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-600">{PROGRAMME_LABELS.P3_DIGITAL_LITERACY}</CardTitle>
              <Cpu className="w-4 h-4 text-[#3191c2]" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{tiles.P3_DIGITAL_LITERACY.upcomingSessions}</p>
              <p className="text-xs text-slate-500">upcoming sessions</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/health">
          <Card className="hover:border-[#3191c2] transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-600">{PROGRAMME_LABELS.P4_HEALTH_NUTRITION}</CardTitle>
              <HeartPulse className="w-4 h-4 text-[#3191c2]" />
            </CardHeader>
            <CardContent className="space-y-1">
              {tiles.P4_HEALTH_NUTRITION.nextCheckup ? (
                <>
                  <p className="text-xs text-slate-600">Next checkup</p>
                  <p className="text-xs font-medium">{formatDateTime(tiles.P4_HEALTH_NUTRITION.nextCheckup.date)}</p>
                  <p className="text-xs text-slate-400">{tiles.P4_HEALTH_NUTRITION.nextCheckup.cci}</p>
                </>
              ) : <p className="text-xs text-slate-400 italic">No upcoming checkup</p>}
            </CardContent>
          </Card>
        </Link>

        <Link href="/library">
          <Card className="hover:border-[#3191c2] transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-slate-600">{PROGRAMME_LABELS.P5_LIBRARY}</CardTitle>
              <Library className="w-4 h-4 text-[#3191c2]" />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xs text-slate-600">Reading levels ({p5total} children)</p>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-slate-100">
                {p5snap.map((n, i) => p5total > 0 && n > 0 && (
                  <div key={i} className="bg-[#3191c2] opacity-${(i+1)*20}" style={{ width: `${(n / p5total) * 100}%`, opacity: 0.4 + i * 0.15 }} />
                ))}
              </div>
              <p className="text-xs text-slate-400">B / L / W / P / S</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
