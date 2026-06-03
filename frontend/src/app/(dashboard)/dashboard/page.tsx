'use client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Building2, Heart, Users, BarChart3, Clock, Award, CalendarCheck, Bell, AlertCircle, Trophy, ArrowRight
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { PROGRAMME_LABELS, humanize, formatDate } from '@/lib/labels';

interface Summary {
  cciCount: number;
  childCount: number;
  volunteerCount: number;
  pendingVolunteers: number;
  complianceScore: number;
  upcomingDeadlines: { id: string; title: string; dueDate: string; cciName: string; severity: string }[];
  recentActivity: { id: string; message: string; timestamp: string; type: string }[];
}

interface VolunteerProfile {
  id: string;
  totalHours: number;
  sessionsAttended?: number;
  badges: { id: string; name: string; iconUrl?: string; awardedAt: string }[];
  user: { name: string; email: string };
}

interface Opportunity {
  id: string;
  title: string;
  date: string;
  programme?: string;
  cci: { name: string };
  spotsLeft: number;
}

function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

function AdminDashboard({ summary, loading }: { summary: Summary | null; loading: boolean }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total CCIs</CardTitle>
                <Building2 className="w-4 h-4 text-[#3191c2]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.cciCount ?? '—'}</div>
                <p className="text-xs text-slate-500 mt-1">Active institutions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Children</CardTitle>
                <Heart className="w-4 h-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.childCount ?? '—'}</div>
                <p className="text-xs text-slate-500 mt-1">Currently enrolled</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Volunteers</CardTitle>
                <Users className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.volunteerCount ?? '—'}</div>
                <p className="text-xs text-slate-500 mt-1">Registered volunteers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Pending Approvals</CardTitle>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.pendingVolunteers ?? '—'}</div>
                <p className="text-xs text-slate-500 mt-1">Awaiting review</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Compliance Score</CardTitle>
                <BarChart3 className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.complianceScore != null ? `${summary.complianceScore}%` : '—'}
                </div>
                <p className="text-xs text-slate-500 mt-1">CCIs fully compliant</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between flex-row">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-500" />
              Upcoming Compliance Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !summary?.upcomingDeadlines?.length ? (
              <p className="text-sm text-slate-400 italic">No upcoming deadlines</p>
            ) : (
              <div className="space-y-2">
                {summary.upcomingDeadlines.map(d => (
                  <div key={d.id} className="flex items-start justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-slate-400">{d.cciName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{new Date(d.dueDate).toLocaleDateString()}</p>
                      <Badge
                        variant="outline"
                        className={
                          d.severity === 'HIGH'
                            ? 'border-red-300 text-red-600 text-xs'
                            : d.severity === 'MEDIUM'
                            ? 'border-amber-300 text-amber-600 text-xs'
                            : 'border-slate-300 text-slate-500 text-xs'
                        }
                      >
                        {d.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#3191c2]" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !summary?.recentActivity?.length ? (
              <p className="text-sm text-slate-400 italic">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {summary.recentActivity.map(a => (
                  <div key={a.id} className="flex items-start gap-2 py-1 border-b last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3191c2] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm">{a.message}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(a.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Getting Started</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>1. Register your CCIs in the <strong>CCIs</strong> section</p>
            <p>2. Add children to each CCI</p>
            <p>3. Onboard volunteers and create opportunities</p>
            <p>4. Log visits and track compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/ccis/new" className="block text-sm text-[#3191c2] hover:underline">+ Register new CCI</Link>
            <Link href="/children/new" className="block text-sm text-[#3191c2] hover:underline">+ Add child profile</Link>
            <Link href="/opportunities/new" className="block text-sm text-[#3191c2] hover:underline">+ Create volunteer opportunity</Link>
            <Link href="/reports" className="block text-sm text-[#3191c2] hover:underline">→ Generate reports</Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function VolunteerDashboard() {
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/volunteers/me'),
      api.get('/opportunities?status=OPEN'),
    ])
      .then(([profileRes, oppRes]) => {
        setProfile(profileRes.data);
        setOpportunities(oppRes.data?.data ?? oppRes.data ?? []);
      })
      .catch(() => toast.error('Failed to load your dashboard'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Hours</CardTitle>
                <Clock className="w-4 h-4 text-[#3191c2]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile?.totalHours != null ? `${profile.totalHours.toFixed(1)}h` : '—'}
                </div>
                <p className="text-xs text-slate-500 mt-1">Volunteer hours logged</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Sessions Attended</CardTitle>
                <CalendarCheck className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.sessionsAttended ?? 0}</div>
                <p className="text-xs text-slate-500 mt-1">Completed sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Badges Earned</CardTitle>
                <Award className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.badges?.length ?? 0}</div>
                <p className="text-xs text-slate-500 mt-1">Recognition badges</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            My Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-3 flex-wrap">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-24 rounded-xl" />)}
            </div>
          ) : !profile?.badges?.length ? (
            <p className="text-sm text-slate-400 italic">No badges yet — keep volunteering!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {profile.badges.map(b => (
                <div
                  key={b.id}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-center"
                >
                  {b.iconUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={b.iconUrl} alt={b.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <Award className="w-8 h-8 text-amber-500" />
                  )}
                  <span className="text-xs font-medium text-amber-800 leading-tight">{b.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#3191c2]" />
            Browse Opportunities
          </CardTitle>
          <Link href="/opportunities">
            <Button size="sm" variant="outline" className="text-[#3191c2] border-[#3191c2]">
              Register <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !opportunities.length ? (
            <p className="text-sm text-slate-400 italic">No open opportunities right now</p>
          ) : (
            <div className="space-y-2">
              {opportunities.slice(0, 6).map(op => (
                <Link
                  key={op.id}
                  href="/opportunities"
                  className="flex items-start justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors border-b last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{op.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {op.cci?.name}
                      {op.programme ? ` · ${PROGRAMME_LABELS[op.programme] ?? humanize(op.programme)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{formatDate(op.date)}</p>
                    <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                      {op.spotsLeft} spots left
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/opportunities">
          <Card className="hover:shadow-sm hover:border-[#3191c2] transition-all cursor-pointer h-full">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="w-10 h-10 rounded-full bg-[#e8f4f9] flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5 text-[#3191c2]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">My Opportunities</p>
                <p className="text-xs text-slate-500">View and manage your registrations</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/leaderboard">
          <Card className="hover:shadow-sm hover:border-[#3191c2] transition-all cursor-pointer h-full">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Leaderboard</p>
                <p className="text-xs text-slate-500">See how you rank among volunteers</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const isVolunteer = user?.role === 'VOLUNTEER';

  useEffect(() => {
    if (isVolunteer) {
      setLoading(false);
      return;
    }
    api
      .get('/dashboard/summary')
      .then(r => setSummary(r.data))
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, [isVolunteer]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          HUManity Foundation — Integrated Operations Platform
        </p>
      </div>

      {isVolunteer ? (
        <VolunteerDashboard />
      ) : (
        <AdminDashboard summary={summary} loading={loading} />
      )}
    </div>
  );
}
