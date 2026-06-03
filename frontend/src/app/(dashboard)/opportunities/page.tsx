'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Calendar, MapPin, Users, ClipboardList, CheckSquare, Square, UserPlus } from 'lucide-react';
import {
  PROGRAMME_LABELS,
  SAFEGUARDING_LEVEL_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  formatDateTime,
  humanize,
} from '@/lib/labels';

interface RegisteredVolunteer {
  id: string;
  userId: string;
  volunteer: { user: { name: string; email: string } };
}

interface ActiveVolunteer {
  userId: string;
  user: { id: string; name: string; email: string };
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

  const [activeVolunteers, setActiveVolunteers] = useState<ActiveVolunteer[]>([]);
  const [walkInSearch, setWalkInSearch] = useState('');
  const [addingWalkIn, setAddingWalkIn] = useState<string | null>(null);

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

  async function loadRegistrations(oppId: string) {
    const res = await api.get(`/opportunities/${oppId}/registrations`);
    setRegistrations(res.data ?? []);
  }

  async function openAttendanceDialog(opp: Opportunity) {
    setAttendanceOpp(opp);
    setAttended(new Set());
    setWalkInSearch('');
    setAttendanceLoading(true);
    try {
      await loadRegistrations(opp.id);
    } catch {
      toast.error('Failed to load registrations');
      setRegistrations([]);
    } finally {
      setAttendanceLoading(false);
    }
    if (canMarkAttendance) {
      api.get('/volunteers?status=ACTIVE')
        .then(r => setActiveVolunteers(r.data ?? []))
        .catch(() => setActiveVolunteers([]));
    }
  }

  function toggleAttended(userId: string) {
    setAttended(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }

  async function addWalkIn(volunteerUserId: string) {
    if (!attendanceOpp) return;
    setAddingWalkIn(volunteerUserId);
    try {
      await api.post(`/opportunities/${attendanceOpp.id}/walk-in`, { volunteerUserId });
      toast.success('Walk-in volunteer added');
      await loadRegistrations(attendanceOpp.id);
      setWalkInSearch('');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to add walk-in');
    } finally {
      setAddingWalkIn(null);
    }
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

  const registeredUserIds = new Set(registrations.map(r => r.userId));
  const walkInResults = walkInSearch.trim()
    ? activeVolunteers
        .filter(v => !registeredUserIds.has(v.user.id))
        .filter(v => {
          const q = walkInSearch.toLowerCase();
          return v.user.name?.toLowerCase().includes(q) || v.user.email?.toLowerCase().includes(q);
        })
        .slice(0, 6)
    : [];

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
                  <Link href={`/opportunities/${opp.id}`} className="min-w-0">
                    <CardTitle className="text-base leading-snug hover:text-[#3191c2] transition-colors">{opp.title}</CardTitle>
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[opp.status] ?? ''}`}>
                    {OPPORTUNITY_STATUS_LABELS[opp.status] ?? humanize(opp.status)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Badge variant="outline" className="text-xs w-fit">
                    {PROGRAMME_LABELS[opp.programmeArea] ?? humanize(opp.programmeArea)}
                  </Badge>
                  {opp.safeguardingLevel && (
                    <Badge variant="outline" className="text-xs w-fit">
                      Safeguarding: {SAFEGUARDING_LEVEL_LABELS[opp.safeguardingLevel] ?? humanize(opp.safeguardingLevel)}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-2">
                <Link
                  href={`/opportunities/${opp.id}`}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#3191c2] transition-colors w-fit"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatDateTime(opp.dateTime)}</span>
                </Link>
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

                  <Link href={`/opportunities/${opp.id}`}>
                    <Button size="sm" variant="ghost" className="text-slate-600">View details</Button>
                  </Link>
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

            {/* Walk-in search */}
            {!attendanceLoading && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Add walk-in volunteer
                </p>
                <Input
                  placeholder="Search active volunteers by name or email"
                  value={walkInSearch}
                  onChange={e => setWalkInSearch(e.target.value)}
                />
                {walkInResults.length > 0 && (
                  <div className="space-y-1.5">
                    {walkInResults.map(v => (
                      <div
                        key={v.user.id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg border"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{v.user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{v.user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-[#3191c2] hover:bg-[#2a7fa8] shrink-0"
                          disabled={addingWalkIn === v.user.id}
                          onClick={() => addWalkIn(v.user.id)}
                        >
                          {addingWalkIn === v.user.id ? 'Adding…' : 'Add'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {walkInSearch.trim() && walkInResults.length === 0 && (
                  <p className="text-xs text-slate-400">No matching active volunteers.</p>
                )}
              </div>
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
