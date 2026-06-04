'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, Calendar, Users, Video, ArrowRightLeft } from 'lucide-react';
import {
  GRADE_LABELS,
  CLASS_SUBJECT_LABELS,
  CLASS_SESSION_STATUS_LABELS,
  weekdayName,
  formatDateTime,
  humanize,
} from '@/lib/labels';

interface ClassSection {
  id: string;
  grade: string;
  subject: string;
  academicYear: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  meetLink: string | null;
  cciId: string | null;
  primaryVolunteerId: string | null;
  isActive: boolean;
  _count: { enrollments: number; sessions: number };
  nextSession: { id: string; date: string; status: string } | null;
}

interface MyClass {
  id: string;
  date: string;
  status: string;
  meetLink: string | null;
  planSubmitted: boolean;
  feedbackSubmitted: boolean;
  classSection: { grade: string; subject: string; academicYear: string };
}

const sessionStatusColor: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SUBSTITUTION_REQUESTED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const GRADE_OPTIONS = ['GRADE_8', 'GRADE_9', 'GRADE_10'];
const SUBJECT_OPTIONS = ['MATHS', 'SCIENCE', 'ENGLISH'];

function ManagerView() {
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    grade: '',
    subject: '',
    academicYear: '2026-27',
    dayOfWeek: '1',
    startTime: '17:00',
    durationMinutes: '60',
    meetLink: '',
  });

  async function load() {
    try {
      const res = await api.get('/classes');
      setSections(res.data ?? []);
    } catch {
      toast.error('Failed to load class sections');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.grade || !form.subject || !form.academicYear) {
      toast.error('Grade, subject and academic year are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/classes', {
        grade: form.grade,
        subject: form.subject,
        academicYear: form.academicYear,
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        durationMinutes: Number(form.durationMinutes),
        meetLink: form.meetLink || undefined,
      });
      toast.success('Section created');
      setForm({ grade: '', subject: '', academicYear: '2026-27', dayOfWeek: '1', startTime: '17:00', durationMinutes: '60', meetLink: '' });
      setDialogOpen(false);
      setLoading(true);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create section');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Education Program — Classes</h1>
          <p className="text-slate-500 text-sm mt-1">{sections.length} section{sections.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]">
              <Plus className="w-4 h-4 mr-2" />New Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Class Section</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select value={form.grade} onValueChange={v => setForm(f => ({ ...f, grade: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map(g => <SelectItem key={g} value={g}>{GRADE_LABELS[g]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {SUBJECT_OPTIONS.map(s => <SelectItem key={s} value={s}>{CLASS_SUBJECT_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select value={form.dayOfWeek} onValueChange={v => setForm(f => ({ ...f, dayOfWeek: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map(d => <SelectItem key={d} value={String(d)}>{weekdayName(d)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} placeholder="17:00" />
                </div>
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" min="0" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Meet Link <span className="text-slate-400">(optional)</span></Label>
                <Input value={form.meetLink} onChange={e => setForm(f => ({ ...f, meetLink: e.target.value }))} placeholder="https://meet.google.com/…" />
              </div>
              <Button onClick={handleCreate} disabled={submitting} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">
                {submitting ? 'Creating…' : 'Create Section'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : sections.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No class sections yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Class</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Next Class</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map(s => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-slate-50">
                  <TableCell>
                    <Link href={`/classes/sections/${s.id}`} className="font-medium text-sm text-slate-900 hover:text-[#3191c2]">
                      {GRADE_LABELS[s.grade] ?? humanize(s.grade)} · {CLASS_SUBJECT_LABELS[s.subject] ?? humanize(s.subject)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{s.academicYear}</TableCell>
                  <TableCell className="text-sm text-slate-600">{weekdayName(s.dayOfWeek)} · {s.startTime}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{s._count.enrollments}</span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {s.nextSession ? formatDateTime(s.nextSession.date) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function VolunteerView() {
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await api.get('/classes/schedule/me');
      setClasses(res.data ?? []);
    } catch {
      toast.error('Failed to load your classes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Upcoming Classes</h1>
          <p className="text-slate-500 text-sm mt-1">{classes.length} scheduled</p>
        </div>
        <Link href="/classes/substitutions">
          <Button variant="outline" className="gap-1.5 text-[#3191c2] border-[#3191c2] hover:bg-[#e8f4f9]">
            <ArrowRightLeft className="w-4 h-4" />Open substitution board
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No upcoming classes scheduled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map(c => {
            const isPast = new Date(c.date).getTime() < Date.now();
            const feedbackPending = !c.feedbackSubmitted && (isPast || c.status !== 'COMPLETED');
            return (
              <Card key={c.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/classes/sessions/${c.id}`} className="min-w-0">
                      <CardTitle className="text-base leading-snug hover:text-[#3191c2] transition-colors">
                        {GRADE_LABELS[c.classSection.grade] ?? humanize(c.classSection.grade)} · {CLASS_SUBJECT_LABELS[c.classSection.subject] ?? humanize(c.classSection.subject)}
                      </CardTitle>
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sessionStatusColor[c.status] ?? ''}`}>
                      {CLASS_SESSION_STATUS_LABELS[c.status] ?? humanize(c.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{c.classSection.academicYear}</p>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatDateTime(c.date)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!c.planSubmitted && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-medium">Plan pending</Badge>
                    )}
                    {feedbackPending && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-medium">Feedback pending</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.meetLink ? (
                      <a href={c.meetLink} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]">
                          <Video className="w-3.5 h-3.5 mr-1.5" />Join Class
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" disabled className="bg-[#3191c2]">
                        <Video className="w-3.5 h-3.5 mr-1.5" />Join Class
                      </Button>
                    )}
                    <Link href={`/classes/sessions/${c.id}`}>
                      <Button size="sm" variant="ghost" className="text-slate-600">Open class</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ClassesPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';
  return isManager ? <ManagerView /> : <VolunteerView />;
}
