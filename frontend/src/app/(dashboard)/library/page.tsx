'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Library as LibraryIcon, Plus, X, Calendar, MapPin, Users } from 'lucide-react';
import {
  READING_LEVEL_LABELS,
  READING_LEVEL_OPTIONS,
  READING_LEVEL_ORDER,
  TEAM_ROLE_LABELS,
  formatDate,
  formatDateTime,
} from '@/lib/labels';

interface CCI { id: string; name: string; district: string }
interface AssessmentHistoryItem { date: string; level: string; bookTitle: string | null }
interface ChildProgress {
  id: string;
  childId: string;
  firstName: string;
  lastName: string | null;
  cciId: string | null;
  latestAssessment: { level: string; date: string; bookTitle: string | null } | null;
  history: AssessmentHistoryItem[];
}
interface ProgressPayload {
  children: ChildProgress[];
  distribution: Record<string, number>;
}
interface TeamMember {
  id: string;
  volunteerId: string;
  teamRole: string;
  volunteer: { id: string; user: { id: string; name: string; email: string | null; mobile: string | null } };
}
interface LibraryActivity {
  id: string;
  title: string;
  dateTime: string;
  requiredCount: number;
  location: string;
  cci: { id: string; name: string; district: string } | null;
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: 'bg-amber-100 text-amber-700 border-amber-200',
  LETTER: 'bg-orange-100 text-orange-700 border-orange-200',
  WORD: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  PARAGRAPH: 'bg-lime-100 text-lime-700 border-lime-200',
  STORY: 'bg-green-100 text-green-700 border-green-200',
  NOT_ASSESSED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function LibraryPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';
  const canSeeCciFilter = isManager || user?.role === 'CCI_MANAGER';

  const [cciId, setCciId] = useState<string>('ALL');
  const [ccis, setCcis] = useState<CCI[]>([]);
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<LibraryActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [form, setForm] = useState({
    childId: '',
    date: new Date().toISOString().slice(0, 10),
    level: '',
    bookTitle: '',
    prathamGroup: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ volunteerId: '', teamRole: 'DEDICATED' });
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const params = cciId && cciId !== 'ALL' ? { cciId } : {};
      const [p, t, a] = await Promise.all([
        api.get('/library/progress', { params }),
        api.get('/library/team'),
        api.get('/library/activities'),
      ]);
      setProgress(p.data);
      setTeam(t.data ?? []);
      setActivities(a.data ?? []);
    } catch {
      toast.error('Failed to load library data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canSeeCciFilter) return;
    api.get('/ccis', { params: { limit: 200 } })
      .then(r => setCcis(Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.items ?? [])))
      .catch(() => { /* volunteers won't have access — silently fall back to "All" */ });
  }, [canSeeCciFilter]);

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cciId]);

  const totalChildren = progress?.children.length ?? 0;
  const distribution = progress?.distribution ?? {
    BEGINNER: 0, LETTER: 0, WORD: 0, PARAGRAPH: 0, STORY: 0, NOT_ASSESSED: 0,
  };

  const selectedChild = useMemo(
    () => progress?.children.find(c => c.id === selectedChildId) ?? null,
    [progress, selectedChildId],
  );

  async function handleSubmitAssessment() {
    if (!form.childId || !form.date || !form.level) {
      toast.error('Child, date and level are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/library/assessments', {
        childId: form.childId,
        date: form.date,
        level: form.level,
        bookTitle: form.bookTitle || undefined,
        prathamGroup: form.prathamGroup || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Assessment recorded');
      setForm(f => ({ ...f, level: '', bookTitle: '', prathamGroup: '', notes: '' }));
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to record assessment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddTeamMember() {
    if (!teamForm.volunteerId) {
      toast.error('Volunteer ID is required');
      return;
    }
    setTeamSubmitting(true);
    try {
      await api.post('/library/team', teamForm);
      toast.success('Volunteer added to Library team');
      setTeamForm({ volunteerId: '', teamRole: 'DEDICATED' });
      setTeamDialogOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add volunteer');
    } finally {
      setTeamSubmitting(false);
    }
  }

  async function handleRemoveTeamMember(volunteerId: string) {
    if (!confirm('Remove this volunteer from the Library team?')) return;
    try {
      await api.delete(`/library/team/${volunteerId}`);
      toast.success('Volunteer removed');
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove volunteer');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#e8f4f9] flex items-center justify-center">
            <LibraryIcon className="w-5 h-5 text-[#3191c2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Library Project (P5)</h1>
            <p className="text-slate-500 text-sm mt-0.5">Pratham-style reading sessions and assessments</p>
          </div>
        </div>
        {canSeeCciFilter && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-600">CCI</Label>
            <Select value={cciId} onValueChange={setCciId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All CCIs</SelectItem>
                {ccis.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Reading-level distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Reading-level Distribution</CardTitle>
          <p className="text-xs text-slate-500">{totalChildren} children tracked</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-6" />)}
            </div>
          ) : (
            [...READING_LEVEL_ORDER, 'NOT_ASSESSED' as const].map(lvl => {
              const count = distribution[lvl] ?? 0;
              const pct = totalChildren > 0 ? Math.round((count / totalChildren) * 100) : 0;
              return (
                <div key={lvl} className="flex items-center gap-3 text-sm">
                  <div className="w-28 text-slate-600 shrink-0">{READING_LEVEL_LABELS[lvl]}</div>
                  <div className="flex-1 h-6 rounded-md bg-slate-100 overflow-hidden">
                    <div
                      className={lvl === 'NOT_ASSESSED' ? 'h-full bg-slate-300' : 'h-full bg-[#3191c2]'}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-slate-600 shrink-0 tabular-nums">
                    {count} <span className="text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dedicated team */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">Dedicated Library Team</CardTitle>
              <p className="text-xs text-slate-500">{team.length} of 5 volunteers</p>
            </div>
            {isManager && (
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]">
                    <Plus className="w-4 h-4 mr-1.5" />Add Volunteer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Library Volunteer</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Volunteer ID</Label>
                      <Input
                        value={teamForm.volunteerId}
                        onChange={e => setTeamForm(f => ({ ...f, volunteerId: e.target.value }))}
                        placeholder="cuid of VolunteerProfile"
                      />
                      <p className="text-xs text-slate-500">
                        Use the VolunteerProfile id from the Volunteers screen.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Team Role</Label>
                      <Select value={teamForm.teamRole} onValueChange={v => setTeamForm(f => ({ ...f, teamRole: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEDICATED">Dedicated</SelectItem>
                          <SelectItem value="SUPPORT">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleAddTeamMember}
                      disabled={teamSubmitting}
                      className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]"
                    >
                      {teamSubmitting ? 'Adding…' : 'Add Volunteer'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : team.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No volunteers assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {team.map(m => {
                  const name = m.volunteer.user.name;
                  const initial = (name?.[0] ?? '?').toUpperCase();
                  return (
                    <li key={m.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50">
                      <div className="w-9 h-9 rounded-full bg-[#e8f4f9] text-[#3191c2] flex items-center justify-center font-medium shrink-0">
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-500 truncate">{m.volunteer.user.email ?? m.volunteer.user.mobile ?? '—'}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{TEAM_ROLE_LABELS[m.teamRole] ?? m.teamRole}</Badge>
                      {isManager && (
                        <button
                          onClick={() => handleRemoveTeamMember(m.volunteerId)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"
                          aria-label="Remove volunteer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming activities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Upcoming Library Activities</CardTitle>
            <p className="text-xs text-slate-500">{activities.length} scheduled</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No upcoming activities.</p>
            ) : (
              <ul className="space-y-2">
                {activities.map(a => (
                  <li key={a.id} className="p-3 border rounded-lg hover:border-[#3191c2] transition-colors">
                    <p className="text-sm font-medium text-slate-900">{a.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateTime(a.dateTime)}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{a.cci ? `${a.cci.name}, ${a.cci.district}` : a.location}</span>
                      <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{a.requiredCount} needed</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment entry */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Record Reading Assessment</CardTitle>
            <p className="text-xs text-slate-500">Capture a child's current Pratham reading level</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Child</Label>
              <Select value={form.childId} onValueChange={v => setForm(f => ({ ...f, childId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a child" /></SelectTrigger>
                <SelectContent>
                  {(progress?.children ?? []).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName ?? ''} ({c.childId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {READING_LEVEL_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Book Title <span className="text-slate-400">(optional)</span></Label>
              <Input value={form.bookTitle} onChange={e => setForm(f => ({ ...f, bookTitle: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Pratham Group <span className="text-slate-400">(optional)</span></Label>
              <Input value={form.prathamGroup} onChange={e => setForm(f => ({ ...f, prathamGroup: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes <span className="text-slate-400">(optional)</span></Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleSubmitAssessment}
              disabled={submitting}
              className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]"
            >
              {submitting ? 'Saving…' : 'Record Assessment'}
            </Button>
          </CardContent>
        </Card>

        {/* Per-child history */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Child Reading History</CardTitle>
            <p className="text-xs text-slate-500">Pick a child to see their assessment timeline</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Child</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger><SelectValue placeholder="Select a child" /></SelectTrigger>
                <SelectContent>
                  {(progress?.children ?? []).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName ?? ''} ({c.childId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedChild ? (
              selectedChild.history.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No assessments recorded yet.</p>
              ) : (
                <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                  {selectedChild.history.map((h, idx) => (
                    <li key={idx} className="relative">
                      <span className="absolute -left-[1.4rem] top-1.5 w-3 h-3 rounded-full bg-[#3191c2] border-2 border-white" />
                      <p className="text-xs text-slate-500">{formatDate(h.date)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={LEVEL_COLORS[h.level] ?? ''}>
                          {READING_LEVEL_LABELS[h.level] ?? h.level}
                        </Badge>
                        {h.bookTitle && <span className="text-xs text-slate-600">{h.bookTitle}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              )
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">Select a child to view history.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
