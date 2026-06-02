'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Trophy, Medal } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  city?: string;
  totalHours: number;
  badgeCount: number;
  topBadge?: { name: string; iconUrl?: string };
}

const MEDAL_STYLES: Record<number, { bg: string; ring: string; text: string; label: string }> = {
  1: { bg: 'bg-amber-50', ring: 'ring-amber-300', text: 'text-amber-600', label: 'Gold' },
  2: { bg: 'bg-slate-50', ring: 'ring-slate-300', text: 'text-slate-500', label: 'Silver' },
  3: { bg: 'bg-orange-50', ring: 'ring-orange-300', text: 'text-orange-600', label: 'Bronze' },
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-orange-400" />;
  return <span className="text-sm font-semibold text-slate-500 w-5 text-center">#{rank}</span>;
}

function EntrySkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-white animate-pulse">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'THIS_MONTH' | 'ALL_TIME'>('ALL_TIME');
  const [city, setCity] = useState('');
  const [cityInput, setCityInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (city) params.set('city', city);
      const res = await api.get(`/volunteers/leaderboard/top?${params}`);
      setEntries(res.data ?? []);
    } catch {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [period, city]);

  useEffect(() => { load(); }, [load]);

  function applyCity() {
    setCity(cityInput.trim());
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Volunteer Leaderboard 🏆</h1>
        <p className="text-slate-500 text-sm mt-1">Top volunteers by hours contributed</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Period</label>
          <Select value={period} onValueChange={v => setPeriod(v as 'THIS_MONTH' | 'ALL_TIME')}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_TIME">All Time</SelectItem>
              <SelectItem value="THIS_MONTH">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">City</label>
          <div className="flex gap-2">
            <Input
              placeholder="Filter by city…"
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyCity()}
              className="w-44"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <EntrySkeleton key={i} />)
        ) : entries.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No leaderboard data yet</p>
          </div>
        ) : (
          entries.map(entry => {
            const medal = MEDAL_STYLES[entry.rank];
            return (
              <Card
                key={entry.userId}
                className={`transition-shadow hover:shadow-sm ${medal ? `${medal.bg} ring-1 ${medal.ring}` : ''}`}
              >
                <CardContent className="py-4 px-5 flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 shrink-0">
                    <RankIcon rank={entry.rank} />
                  </div>

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${medal ? `bg-white ring-2 ${medal.ring} ${medal.text}` : 'bg-[#e8f4f9] text-[#3191c2]'}`}>
                    {entry.name[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{entry.name}</p>
                    <p className="text-xs text-slate-500">
                      {entry.city ?? ''}
                      {entry.city && entry.badgeCount > 0 ? ' · ' : ''}
                      {entry.badgeCount > 0 ? `${entry.badgeCount} badge${entry.badgeCount !== 1 ? 's' : ''}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {entry.topBadge && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#e8f4f9] text-[#3191c2] font-medium flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {entry.topBadge.name}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={medal ? `${medal.bg} ${medal.text} border-current font-bold` : 'font-semibold'}
                    >
                      {entry.totalHours.toFixed(1)}h
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
