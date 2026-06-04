'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HeartPulse, Plus, X, Calendar, Stethoscope, Megaphone, Users } from 'lucide-react';
import { HEALTH_EVENT_TYPE_LABELS, TEAM_ROLE_LABELS, formatDate, formatDateTime } from '@/lib/labels';

interface DashboardRow {
  cciId: string;
  cciName: string;
  district: string;
  lastCheckupDate: string | null;
  childrenMeasuredThisQuarter: number;
  bmiOutliers: number;
  upcomingAwareness: { id: string; dateTime: string } | null;
}

interface UpcomingOpportunity {
  id: string;
  title: string;
  dateTime: string;
  healthEventType: string;
  cci: { id: string; name: string; district: string } | null;
}

interface DashboardPayload {
  ccis: DashboardRow[];
  upcomingCheckups: UpcomingOpportunity[];
  upcomingAwareness: UpcomingOpportunity[];
}

interface TeamMember {
  id: string;
  volunteerId: string;
  teamRole: string;
  volunteer: {
    id: string;
    user: { id: string; name: string; email: string; mobile?: string | null };
  };
}

export default function HealthDashboardPage() {
  const { user } = useAuth();
  const canManageTeam = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ volunteerId: '', teamRole: 'DEDICATED' });

  async function load() {
    try {
      const [d, t] = await Promise.all([
        api.get('/health/dashboard'),
        api.get('/health/team'),
      ]);
      setDashboard(d.data);
      setTeam(t.data ?? []);
    } catch {
      toast.error('Failed to load Health & Nutrition data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!form.volunteerId.trim()) {
      toast.error('Volunteer ID required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/health/team', { volunteerId: form.volunteerId.trim(), teamRole: form.teamRole });
      toast.success('Volunteer added to Health & Nutrition');
      setForm({ volunteerId: '', teamRole: 'DEDICATED' });
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add volunteer');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(volunteerId: string) {
    try {
      await api.delete(`/health/team/${volunteerId}`);
      toast.success('Removed from roster');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  }

  const dedicatedCount = team.filter(t => t.teamRole === 'DEDICATED').length;
  const otherCount = team.length - dedicatedCount;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-[#3191c2]" />Health &amp; Nutrition (P4)
        </h1>
        <p className="text-slate-500 text-sm mt-1">Quarterly checkups, monthly awareness drives, and the dedicated programme team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-[#3191c2]" />Dedicated Team</CardTitle>
              {canManageTeam && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8] h-7 px-2"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Volunteer to Health &amp; Nutrition</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Volunteer Profile ID</Label>
                        <Input
                          placeholder="Paste from /volunteers"
                          value={form.volunteerId}
                          onChange={e => setForm(f => ({ ...f, volunteerId: e.target.value }))}
                        />
                        <p className="text-xs text-slate-500">Open the volunteer list, copy the profile id, then paste here.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Role on Team</Label>
                        <Select value={form.teamRole} onValueChange={v => setForm(f => ({ ...f, teamRole: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEDICATED">{TEAM_ROLE_LABELS.DEDICATED}</SelectItem>
                            <SelectItem value="SUPPORT">{TEAM_ROLE_LABELS.SUPPORT}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAdd} disabled={submitting} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">
                        {submitting ? 'Adding…' : 'Add to Team'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">{dedicatedCount} dedicated · {otherCount} other{otherCount !== 1 ? 's' : ''}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <>
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </>
            ) : team.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No team members yet.</p>
            ) : (
              team.map(m => {
                const initial = m.volunteer.user.name?.[0]?.toUpperCase() ?? '?';
                return (
                  <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border bg-white px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-[#e8f4f9] text-[#3191c2] font-semibold text-sm shrink-0">{initial}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{m.volunteer.user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{m.volunteer.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{TEAM_ROLE_LABELS[m.teamRole] ?? m.teamRole}</Badge>
                      {canManageTeam && (
                        <button
                          onClick={() => handleRemove(m.volunteerId)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          aria-label="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Stethoscope className="w-4 h-4 text-[#3191c2]" />Upcoming Quarterly Checkups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <>{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</>
            ) : !dashboard?.upcomingCheckups?.length ? (
              <p className="text-sm text-slate-400 py-4 text-center">None scheduled.</p>
            ) : (
              dashboard.upcomingCheckups.map(o => (
                <Link
                  key={o.id}
                  href={`/health/checkups/${o.id}`}
                  className="block rounded-md border bg-white px-3 py-2 hover:border-[#3191c2] hover:bg-[#f4fafd] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{o.cci?.name ?? 'CCI (TBD)'}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />{formatDateTime(o.dateTime)}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] shrink-0">{HEALTH_EVENT_TYPE_LABELS.QUARTERLY_CHECKUP}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Megaphone className="w-4 h-4 text-[#3191c2]" />Upcoming Monthly Awareness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <>{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</>
            ) : !dashboard?.upcomingAwareness?.length ? (
              <p className="text-sm text-slate-400 py-4 text-center">None scheduled.</p>
            ) : (
              dashboard.upcomingAwareness.map(o => (
                <div key={o.id} className="rounded-md border bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{o.cci?.name ?? 'CCI (TBD)'}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />{formatDateTime(o.dateTime)}
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] shrink-0">{HEALTH_EVENT_TYPE_LABELS.MONTHLY_AWARENESS}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Per-CCI Health Status</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !dashboard?.ccis?.length ? (
          <p className="text-sm text-slate-400 py-6 text-center border rounded-lg">No active CCIs.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>CCI</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Last Checkup</TableHead>
                  <TableHead className="text-right">Children Measured (90d)</TableHead>
                  <TableHead className="text-right">BMI Outliers</TableHead>
                  <TableHead>Next Awareness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.ccis.map(r => (
                  <TableRow key={r.cciId}>
                    <TableCell className="font-medium text-sm text-slate-900">{r.cciName}</TableCell>
                    <TableCell className="text-sm text-slate-600">{r.district}</TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDate(r.lastCheckupDate)}</TableCell>
                    <TableCell className="text-sm text-slate-600 text-right">{r.childrenMeasuredThisQuarter}</TableCell>
                    <TableCell className="text-right">
                      {r.bmiOutliers > 0 ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200">{r.bmiOutliers}</Badge>
                      ) : (
                        <span className="text-sm text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDate(r.upcomingAwareness?.dateTime ?? null)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
