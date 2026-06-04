'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Video, Users, X, Plus, CheckCircle2, Circle } from 'lucide-react';
import {
  GRADE_LABELS,
  CLASS_SUBJECT_LABELS,
  CLASS_SESSION_STATUS_LABELS,
  weekdayName,
  formatDateTime,
  humanize,
} from '@/lib/labels';

const sessionStatusColor: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SUBSTITUTION_REQUESTED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

interface Enrollment {
  classSectionId: string;
  childId: string;
  child: { id: string; childId: string; firstName: string; lastName: string };
}

interface SessionRow {
  id: string;
  date: string;
  status: string;
  assignedVolunteerId: string | null;
  lessonPlanSubmittedAt: string | null;
  feedbackSubmittedAt: string | null;
}

interface Section {
  id: string;
  grade: string;
  subject: string;
  academicYear: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  meetLink: string | null;
  enrollments: Enrollment[];
  sessions: SessionRow[];
}

export default function SectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [section, setSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);
  const [childIdInput, setChildIdInput] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get(`/classes/${id}`);
      setSection(res.data);
    } catch {
      toast.error('Failed to load section');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleEnroll() {
    const childId = childIdInput.trim();
    if (!childId) {
      toast.error('Enter a child ID');
      return;
    }
    setEnrolling(true);
    try {
      await api.post(`/classes/${id}/enroll`, { childId });
      toast.success('Child enrolled');
      setChildIdInput('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to enroll child');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleRemove(childId: string) {
    setRemovingId(childId);
    try {
      await api.delete(`/classes/${id}/enroll/${childId}`);
      toast.success('Child removed');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove child');
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!section) return <div className="p-6 text-slate-500">Section not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link href="/classes" className="text-slate-400 hover:text-slate-600 text-sm">← Classes</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          {GRADE_LABELS[section.grade] ?? humanize(section.grade)} · {CLASS_SUBJECT_LABELS[section.subject] ?? humanize(section.subject)}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{section.academicYear}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{weekdayName(section.dayOfWeek)} · {section.startTime}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-2 text-sm text-slate-600">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{section.durationMinutes} minutes</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-2 text-sm text-slate-600">
            <Video className="w-4 h-4 shrink-0" />
            {section.meetLink ? (
              <a href={section.meetLink} target="_blank" rel="noopener noreferrer" className="text-[#3191c2] hover:underline truncate">
                {section.meetLink}
              </a>
            ) : <span className="text-slate-400">No meet link</span>}
          </CardContent>
        </Card>
      </div>

      {/* Roster */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Users className="w-4 h-4" />Roster ({section.enrollments.length})
          </h2>
          <div className="flex gap-2">
            <Input
              placeholder="Child ID"
              value={childIdInput}
              onChange={e => setChildIdInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEnroll(); }}
              className="h-9 w-48"
            />
            <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={enrolling} onClick={handleEnroll}>
              <Plus className="w-4 h-4 mr-1.5" />{enrolling ? 'Enrolling…' : 'Enroll child'}
            </Button>
          </div>
        </div>

        {section.enrollments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border rounded-lg">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No children enrolled yet.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Child ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.enrollments.map(e => (
                  <TableRow key={e.childId}>
                    <TableCell className="text-sm font-medium text-slate-700">{e.child.childId}</TableCell>
                    <TableCell className="text-sm text-slate-600">{e.child.firstName} {e.child.lastName}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                        disabled={removingId === e.childId}
                        onClick={() => handleRemove(e.childId)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Sessions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />Sessions ({section.sessions.length})
        </h2>
        {section.sessions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border rounded-lg">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No sessions scheduled.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.sessions.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-slate-50">
                    <TableCell>
                      <Link href={`/classes/sessions/${s.id}`} className="text-sm font-medium text-slate-700 hover:text-[#3191c2]">
                        {formatDateTime(s.date)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sessionStatusColor[s.status] ?? ''}`}>
                        {CLASS_SESSION_STATUS_LABELS[s.status] ?? humanize(s.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.lessonPlanSubmittedAt
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <Circle className="w-4 h-4 text-slate-300" />}
                    </TableCell>
                    <TableCell>
                      {s.feedbackSubmittedAt
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <Circle className="w-4 h-4 text-slate-300" />}
                    </TableCell>
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
