'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Calendar, MapPin, Users, ClipboardList, CheckSquare, Square } from 'lucide-react';

interface RegisteredVolunteer {
  id: string;
  userId: string;
  volunteer: { user: { name: string; email: string } };
}

interface Opportunity {
  id: string;
  title: string;
  programmeArea: string;
  location: string;
  dateTime: string;
  durationMinutes: number;
  requiredCount: number;
  status: string;
  description?: string;
  safeguardingLevel: string;
  requiredSkills: { skill: { name: string } }[];
  _count: { registrations: number };
  isRegistered?: boolean;
}

const statusColor: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  FULL: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

const safeguardingColor: Record<string, string> = {
  BASIC: 'bg-blue-50 text-blue-600 border-blue-200',
  ENHANCED: 'bg-purple-50 text-purple-600 border-purple-200',
  NONE: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const [attendanceOpp, setAttendanceOpp] = useState<Opportunity | null>(null);
  const [registrations, setRegistrations] = useState<RegisteredVolunteer[]>([]);
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';
  const canMarkAttendance = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER' || user?.role === 'CCI_MANAGER';
  const isVolunteer = user?.role === 'VOLUNTEER';

  async function loadOpps() {
    try {
      const res = await api.get('/opportunities');
      setOpps(res.data ?? []);
    } catch {
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadOpps(); }, []);

  async function register(oppId: string) {
    setRegisteringId(oppId);
    try {
      await api.post(`/opportunities/${oppId}/register`);
      toast.success('Registered successfully!');
      loadOpps();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not register');
    } finally {
      setRegisteringId(null);
    }
  }

  async function openAttendanceDialog(opp: Opportunity) {
    setAttendanceOpp(opp);
    setAttended(new Set());
    setAttendanceLoading(true);
    try {
      const res = await api.get(`/opportunities/${opp.id}/registrations`);
      setRegistrations(res.data ?? []);
    } catch {
      toast.error('Failed to load registrations');
      setRegistrations([]);
    } finally {
      setAttendanceLoading(false);
    }
  }

  function toggleAttended(userId: string) {
    setAttended(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }

  async function submitAttendance() {
    if (!attendanceOpp) return;
    setSubmitting(true);
    try {
      await api.post(`/opportunities/${attendanceOpp.id}/attendance`, {
        attendedVolunteerIds: Array.from(attended),
      });
      toast.success('Attendance marked successfully');
      setAttendanceOpp(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Opportunities</h1>
          <p className="text-slate-500 text-sm mt-1">{opps.filter(o => o.status === 'OPEN').length} open</p>
        </div>
        {canCreate && (
          <Link href="/opportunities/new">
            <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]">
              <Plus className="w-4 h-4 mr-2" />Create
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : opps.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No open opportunities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opps.map(opp => (
            <Card key={opp.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{opp.title}</CardTitle>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[opp.status] ?? ''}`}>
                    {opp.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Badge variant="outline" className="text-xs w-fit">{opp.programmeArea.replace('_', ' ')}</Badge>
                  {opp.safeguardingLevel && (
                    <Badge variant="outline" className={`text-xs w-fit ${safeguardingColor[opp.safeguardingLevel] ?? ''}`}>
                      Safeguarding: {opp.safeguardingLevel}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{new Date(opp.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{opp.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{opp._count.registrations} / {opp.requiredCount} registered</span>
                </div>

                {opp.requiredSkills.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {opp.requiredSkills.map(s => (
                      <Badge key={s.skill.name} variant="secondary" className="text-xs">{s.skill.name}</Badge>
                    ))}
                  </div>
                )}
                {opp.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{opp.description}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {isVolunteer && opp.status === 'OPEN' && (
                    opp.isRegistered ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 font-medium">Registered</Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-[#3191c2] hover:bg-[#2a7fa8]"
                        disabled={registeringId === opp.id}
                        onClick={() => register(opp.id)}
                      >
                        {registeringId === opp.id ? 'Registering…' : 'Register'}
                      </Button>
                    )
                  )}

                  {canMarkAttendance && (opp.status === 'COMPLETED' || opp.status === 'OPEN') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-[#3191c2] border-[#3191c2] hover:bg-[#e8f4f9]"
                      onClick={() => openAttendanceDialog(opp)}
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Mark Attendance
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Attendance dialog */}
      <Dialog open={!!attendanceOpp} onOpenChange={open => { if (!open) setAttendanceOpp(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Attendance — {attendanceOpp?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {attendanceLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : registrations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No registered volunteers.</p>
            ) : (
              registrations.map(reg => {
                const uid = reg.userId;
                const checked = attended.has(uid);
                return (
                  <button
                    key={reg.id}
                    onClick={() => toggleAttended(uid)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors text-left"
                  >
                    {checked
                      ? <CheckSquare className="w-5 h-5 text-[#3191c2] shrink-0" />
                      : <Square className="w-5 h-5 text-slate-300 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{reg.volunteer.user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{reg.volunteer.user.email}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <p className="text-xs text-slate-500">{attended.size} of {registrations.length} marked</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAttendanceOpp(null)}>Cancel</Button>
              <Button
                className="bg-[#3191c2] hover:bg-[#2a7fa8]"
                disabled={submitting || registrations.length === 0}
                onClick={submitAttendance}
              >
                {submitting ? 'Saving…' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
