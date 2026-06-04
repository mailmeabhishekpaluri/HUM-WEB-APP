'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, MapPin, Users, Clock, ShieldCheck, Pencil, BookOpen } from 'lucide-react';
import {
  PROGRAMME_LABELS,
  PROGRAMME_OPTIONS,
  SAFEGUARDING_LEVEL_LABELS,
  SAFEGUARDING_LEVEL_OPTIONS,
  OPPORTUNITY_STATUS_LABELS,
  formatDateTime,
  humanize,
} from '@/lib/labels';

interface Registration {
  id: string;
  volunteer: { user: { name: string; email?: string } };
}

interface Opportunity {
  id: string;
  title: string;
  programmeArea: string;
  cciId?: string | null;
  location: string;
  dateTime: string;
  durationMinutes: number;
  requiredCount: number;
  status: string;
  description?: string;
  safeguardingLevel: string;
  requiredSkills: { skill: { id: string; name: string } }[];
  registrations: Registration[];
}

const statusColor: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  FULL: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-amber-100 text-amber-700',
};

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [form, setForm] = useState({
    title: '', programmeArea: '', dateTime: '', durationMinutes: '',
    location: '', requiredCount: '', description: '', safeguardingLevel: '',
  });
  const [program, setProgram] = useState<any>(null);
  const [fb, setFb] = useState({
    childrenPresent: '', childrenEngaged: '', childParticipationRating: '',
    volunteerParticipationRating: '', volunteersPresent: '', whatWentWell: '',
    challenges: '', followUpNeeded: false, followUpNotes: '',
  });
  const [fbBusy, setFbBusy] = useState(false);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';
  const isOnGroundProgram = opp?.programmeArea === 'P2_SEL' || opp?.programmeArea === 'P3_DIGITAL_LITERACY';

  async function load() {
    try {
      const res = await api.get(`/opportunities/${id}`);
      setOpp(res.data);
      if (res.data.programmeArea === 'P2_SEL' || res.data.programmeArea === 'P3_DIGITAL_LITERACY') {
        const [prog, fbRes] = await Promise.all([
          api.get(`/programs/sessions/${id}`).catch(() => null),
          api.get(`/opportunities/${id}/feedback`).catch(() => null),
        ]);
        if (prog?.data) setProgram(prog.data);
        if (fbRes?.data) {
          const f = fbRes.data;
          setFb({
            childrenPresent: f.childrenPresent?.toString() ?? '',
            childrenEngaged: f.childrenEngaged?.toString() ?? '',
            childParticipationRating: f.childParticipationRating?.toString() ?? '',
            volunteerParticipationRating: f.volunteerParticipationRating?.toString() ?? '',
            volunteersPresent: f.volunteersPresent?.toString() ?? '',
            whatWentWell: f.whatWentWell ?? '',
            challenges: f.challenges ?? '',
            followUpNeeded: f.followUpNeeded ?? false,
            followUpNotes: f.followUpNotes ?? '',
          });
        }
      }
    } catch {
      toast.error('Failed to load opportunity');
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    setFbBusy(true);
    try {
      await api.post(`/opportunities/${id}/feedback`, {
        childrenPresent: fb.childrenPresent ? Number(fb.childrenPresent) : null,
        childrenEngaged: fb.childrenEngaged ? Number(fb.childrenEngaged) : null,
        childParticipationRating: fb.childParticipationRating ? Number(fb.childParticipationRating) : null,
        volunteerParticipationRating: fb.volunteerParticipationRating ? Number(fb.volunteerParticipationRating) : null,
        volunteersPresent: fb.volunteersPresent ? Number(fb.volunteersPresent) : null,
        whatWentWell: fb.whatWentWell || null,
        challenges: fb.challenges || null,
        followUpNeeded: fb.followUpNeeded,
        followUpNotes: fb.followUpNotes || null,
      });
      toast.success('Session feedback saved');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not save feedback');
    } finally {
      setFbBusy(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function toDatetimeLocal(value: string): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openEdit() {
    if (!opp) return;
    setForm({
      title: opp.title,
      programmeArea: opp.programmeArea,
      dateTime: toDatetimeLocal(opp.dateTime),
      durationMinutes: String(opp.durationMinutes),
      location: opp.location,
      requiredCount: String(opp.requiredCount),
      description: opp.description ?? '',
      safeguardingLevel: opp.safeguardingLevel,
    });
    setEditing(true);
  }

  const setI = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setF = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  async function saveEdit() {
    if (!opp) return;
    setSavingEdit(true);
    try {
      await api.patch(`/opportunities/${id}`, {
        title: form.title,
        programmeArea: form.programmeArea,
        dateTime: form.dateTime,
        durationMinutes: Number(form.durationMinutes),
        location: form.location,
        requiredCount: Number(form.requiredCount),
        description: form.description,
        safeguardingLevel: form.safeguardingLevel,
      });
      toast.success('Opportunity updated');
      setEditing(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to update');
    } finally {
      setSavingEdit(false);
    }
  }

  async function changeStatus(status: string, label: string) {
    setStatusBusy(true);
    try {
      await api.patch(`/opportunities/${id}/status`, { status });
      toast.success(label);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to update status');
    } finally {
      setStatusBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-20 text-slate-400">
        <p>Opportunity not found.</p>
        <Link href="/opportunities"><Button variant="outline" className="mt-4">Back to Opportunities</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.push('/opportunities')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900 truncate">{opp.title}</h1>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColor[opp.status] ?? ''}`}>
          {OPPORTUNITY_STATUS_LABELS[opp.status] ?? humanize(opp.status)}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {PROGRAMME_LABELS[opp.programmeArea] ?? humanize(opp.programmeArea)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Safeguarding: {SAFEGUARDING_LEVEL_LABELS[opp.safeguardingLevel] ?? humanize(opp.safeguardingLevel)}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{formatDateTime(opp.dateTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{opp.durationMinutes} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{opp.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{opp.registrations.length} / {opp.requiredCount} registered</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{SAFEGUARDING_LEVEL_LABELS[opp.safeguardingLevel] ?? humanize(opp.safeguardingLevel)}</span>
            </div>
          </div>

          {opp.description && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{opp.description}</p>
            </div>
          )}

          {opp.requiredSkills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {opp.requiredSkills.map(s => (
                  <Badge key={s.skill.id} variant="secondary" className="text-xs">{s.skill.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Registered Volunteers ({opp.registrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {opp.registrations.length === 0 ? (
            <p className="text-sm text-slate-400">No volunteers registered yet.</p>
          ) : (
            <div className="space-y-2">
              {opp.registrations.map(reg => (
                <div key={reg.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{reg.volunteer.user.name}</p>
                    {reg.volunteer.user.email && (
                      <p className="text-xs text-slate-500 truncate">{reg.volunteer.user.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isOnGroundProgram && program?.curriculumItem && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#3191c2]" />Curriculum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">{program.curriculumItem.title}</p>
            {program.curriculumItem.objective && (
              <p className="text-slate-600"><span className="text-slate-400">Objective: </span>{program.curriculumItem.objective}</p>
            )}
            {program.curriculumItem.activities?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {program.curriculumItem.activities.map((a: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">{a}</Badge>
                ))}
              </div>
            )}
            {program.curriculumItem.outcome && (
              <p className="text-slate-500"><span className="text-slate-400">Outcome: </span>{program.curriculumItem.outcome}</p>
            )}
          </CardContent>
        </Card>
      )}

      {isOnGroundProgram && program?.ratio && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Volunteer Ratio (1:6)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-2xl font-bold text-slate-900">{program.volunteerCount}</span>
                <span className="text-slate-500"> volunteers · need </span>
                <span className="font-semibold">{program.ratio.required}</span>
                <span className="text-slate-500"> for {program.studentCount ?? 0} students</span>
              </div>
              <Badge className={program.ratio.met ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                {program.ratio.met ? 'Ratio met' : `Need ${Math.max(0, program.ratio.required - program.volunteerCount)} more`}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {isOnGroundProgram && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Post-session Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Children present</Label><Input type="number" value={fb.childrenPresent} onChange={e => setFb(f => ({ ...f, childrenPresent: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Children engaged</Label><Input type="number" value={fb.childrenEngaged} onChange={e => setFb(f => ({ ...f, childrenEngaged: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Volunteers present</Label><Input type="number" value={fb.volunteersPresent} onChange={e => setFb(f => ({ ...f, volunteersPresent: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Child participation (1-5)</Label><Input type="number" min="1" max="5" value={fb.childParticipationRating} onChange={e => setFb(f => ({ ...f, childParticipationRating: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Volunteer participation (1-5)</Label><Input type="number" min="1" max="5" value={fb.volunteerParticipationRating} onChange={e => setFb(f => ({ ...f, volunteerParticipationRating: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">What went well</Label><Textarea rows={2} value={fb.whatWentWell} onChange={e => setFb(f => ({ ...f, whatWentWell: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Challenges</Label><Textarea rows={2} value={fb.challenges} onChange={e => setFb(f => ({ ...f, challenges: e.target.value }))} /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={fb.followUpNeeded} onChange={e => setFb(f => ({ ...f, followUpNeeded: e.target.checked }))} />
              Follow-up needed
            </label>
            {fb.followUpNeeded && (
              <div className="space-y-1"><Label className="text-xs">Follow-up notes</Label><Textarea rows={2} value={fb.followUpNotes} onChange={e => setFb(f => ({ ...f, followUpNotes: e.target.value }))} /></div>
            )}
            <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={fbBusy} onClick={submitFeedback}>Save Feedback</Button>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Manage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]" onClick={openEdit}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button variant="outline" disabled={statusBusy || opp.status === 'FULL'} onClick={() => changeStatus('FULL', 'Opportunity closed (full)')}>
              Close
            </Button>
            <Button variant="outline" disabled={statusBusy || opp.status === 'COMPLETED'} onClick={() => changeStatus('COMPLETED', 'Marked complete')}>
              Mark Complete
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              disabled={statusBusy || opp.status === 'CANCELLED'}
              onClick={() => changeStatus('CANCELLED', 'Opportunity cancelled')}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2"><Label>Title</Label><Input value={form.title} onChange={setI('title')} /></div>
            <div className="space-y-2">
              <Label>Programme Area</Label>
              <Select value={form.programmeArea} onValueChange={setF('programmeArea')}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PROGRAMME_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Safeguarding Level</Label>
              <Select value={form.safeguardingLevel} onValueChange={setF('safeguardingLevel')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAFEGUARDING_LEVEL_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date &amp; Time</Label><Input type="datetime-local" value={form.dateTime} onChange={setI('dateTime')} /></div>
            <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" value={form.durationMinutes} onChange={setI('durationMinutes')} /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={setI('location')} /></div>
            <div className="space-y-2"><Label>Volunteers Required</Label><Input type="number" value={form.requiredCount} onChange={setI('requiredCount')} /></div>
            <div className="sm:col-span-2 space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={setI('description')} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={savingEdit} onClick={saveEdit}>
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
