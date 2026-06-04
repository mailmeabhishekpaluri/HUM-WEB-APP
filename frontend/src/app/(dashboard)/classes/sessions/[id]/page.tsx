'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import {
  GRADE_LABELS,
  CLASS_SUBJECT_LABELS,
  CLASS_SESSION_STATUS_LABELS,
  formatDateTime,
  humanize,
} from '@/lib/labels';

interface EnrolledChild { id: string; childId: string; firstName: string; lastName?: string }
interface Attendance { childId: string; present: boolean; note?: string }
interface SessionDetail {
  id: string;
  date: string;
  status: string;
  assignedVolunteerId: string | null;
  meetLink: string | null;
  topic: string | null;
  lessonPlan: string | null;
  lessonPlanSubmittedAt: string | null;
  classFeedback: string | null;
  feedbackSubmittedAt: string | null;
  classSection: {
    grade: string;
    subject: string;
    academicYear: string;
    meetLink: string | null;
    enrollments: { child: EnrolledChild }[];
  };
  attendance: Attendance[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState('');
  const [topic, setTopic] = useState('');
  const [feedback, setFeedback] = useState('');
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [subReason, setSubReason] = useState('');
  const [subOpen, setSubOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/classes/sessions/${id}`);
      setSession(data);
      setPlan(data.lessonPlan ?? '');
      setTopic(data.topic ?? '');
      setFeedback(data.classFeedback ?? '');
      const map: Record<string, boolean> = {};
      for (const e of data.classSection.enrollments) map[e.child.id] = false;
      for (const a of data.attendance) map[a.childId] = a.present;
      setPresent(map);
    } catch {
      toast.error('Failed to load class session');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function submitPlan() {
    setBusy(true);
    try {
      await api.post(`/classes/sessions/${id}/plan`, { lessonPlan: plan, topic });
      toast.success('Lesson plan submitted');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not submit plan');
    } finally { setBusy(false); }
  }

  async function saveAttendance() {
    setBusy(true);
    try {
      const records = Object.entries(present).map(([childId, p]) => ({ childId, present: p }));
      await api.post(`/classes/sessions/${id}/attendance`, { records });
      toast.success('Attendance saved');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not save attendance');
    } finally { setBusy(false); }
  }

  async function submitFeedback() {
    setBusy(true);
    try {
      await api.post(`/classes/sessions/${id}/feedback`, { classFeedback: feedback });
      toast.success('Feedback submitted — class marked complete');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not submit feedback');
    } finally { setBusy(false); }
  }

  async function requestSub() {
    setBusy(true);
    try {
      await api.post(`/classes/sessions/${id}/substitution-request`, { reason: subReason });
      toast.success('Substitution requested — volunteers notified');
      setSubOpen(false);
      setSubReason('');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not request substitution');
    } finally { setBusy(false); }
  }

  if (loading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!session) return <div className="p-6 text-slate-500">Class session not found.</div>;

  const meetLink = session.meetLink || session.classSection.meetLink;
  const isAssigned = session.assignedVolunteerId === user?.id;
  const isManager = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';
  const canAct = isAssigned || isManager;
  const locked = session.status === 'COMPLETED';

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {GRADE_LABELS[session.classSection.grade] ?? humanize(session.classSection.grade)} · {CLASS_SUBJECT_LABELS[session.classSection.subject] ?? humanize(session.classSection.subject)}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{formatDateTime(session.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{CLASS_SESSION_STATUS_LABELS[session.status] ?? humanize(session.status)}</Badge>
          {meetLink && (
            <a href={meetLink} target="_blank" rel="noopener noreferrer">
              <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]"><Video className="w-4 h-4 mr-2" />Join Meet</Button>
            </a>
          )}
          {canAct && !locked && (
            <Dialog open={subOpen} onOpenChange={setSubOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><ArrowRightLeft className="w-4 h-4 mr-2" />Request Substitution</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Request a substitute</DialogTitle></DialogHeader>
                <Label>Reason (optional)</Label>
                <Textarea value={subReason} onChange={e => setSubReason(e.target.value)} placeholder="Why can't you take this class?" />
                <DialogFooter>
                  <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={busy} onClick={requestSub}>Broadcast Request</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="plan">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="plan">Lesson Plan</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          <Card>
            <CardHeader><CardTitle className="text-base">Lesson Plan (submit before class)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {session.lessonPlanSubmittedAt && (
                <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Submitted {formatDateTime(session.lessonPlanSubmittedAt)}</p>
              )}
              <div className="space-y-1">
                <Label>Topic</Label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Linear equations" disabled={!canAct} />
              </div>
              <div className="space-y-1">
                <Label>Plan</Label>
                <Textarea rows={6} value={plan} onChange={e => setPlan(e.target.value)} placeholder="Outline the lesson…" disabled={!canAct} />
              </div>
              {canAct && <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={busy} onClick={submitPlan}>Submit Plan</Button>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle className="text-base">Child Attendance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {session.classSection.enrollments.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No children enrolled in this section.</p>
              ) : (
                <div className="space-y-2">
                  {session.classSection.enrollments.map(({ child }) => (
                    <label key={child.id} className="flex items-center gap-3 py-1.5 border-b last:border-0 cursor-pointer">
                      <Checkbox checked={!!present[child.id]} onCheckedChange={v => setPresent(p => ({ ...p, [child.id]: v }))} disabled={!canAct} />
                      <span className="text-sm">{child.firstName} {child.lastName ?? ''}</span>
                      <span className="text-xs text-slate-400 ml-auto">{child.childId}</span>
                    </label>
                  ))}
                </div>
              )}
              {canAct && session.classSection.enrollments.length > 0 && (
                <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={busy} onClick={saveAttendance}>Save Attendance</Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback">
          <Card>
            <CardHeader><CardTitle className="text-base">Class Feedback (submit after class)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {session.feedbackSubmittedAt ? (
                <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Submitted {formatDateTime(session.feedbackSubmittedAt)} — session locked</p>
              ) : (
                <p className="text-xs text-amber-600">Submitting feedback marks this class complete and locks it.</p>
              )}
              <Textarea rows={5} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="How did the class go?" disabled={!canAct || locked} />
              {canAct && !locked && <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={busy} onClick={submitFeedback}>Submit Feedback</Button>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
