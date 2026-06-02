'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Mail, MapPin, Building2, Calendar, Clock,
  Award, CheckCircle2, XCircle, PauseCircle, Shield, Star,
} from 'lucide-react';

interface VolunteerDetail {
  id: string;
  userId: string;
  city: string;
  organisation: string;
  domain: string;
  totalHours: number;
  sessionsAttended: number;
  accountStatus: string;
  policeVerification: string;
  safeguardingStatus: string;
  createdAt: string;
  user: { name: string; email: string };
  skills: { skill: { name: string } }[];
  badges: { badge: { name: string; description?: string; iconUrl?: string } }[];
}

interface AttendanceRecord {
  id: string;
  opportunity: { title: string; dateTime: string; location: string };
  attended: boolean;
  hours: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    ACTIVE: 'bg-green-100 text-green-700 border-green-200',
    ON_HOLD: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <Badge variant="outline" className={map[status] ?? 'bg-slate-100 text-slate-600'}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function VerificationBadge({ label, status, passValue }: { label: string; status: string; passValue: string }) {
  const passed = status === passValue;
  return (
    <Badge variant="outline" className={passed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
      {passed ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
      {label}: {status.replace(/_/g, ' ')}
    </Badge>
  );
}

export default function VolunteerDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: authUser } = useAuth();
  const router = useRouter();

  const [volunteer, setVolunteer] = useState<VolunteerDetail | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const canAct = authUser?.role === 'SUPER_ADMIN' || authUser?.role === 'PROGRAM_MANAGER';

  async function load() {
    try {
      const [vRes, aRes] = await Promise.allSettled([
        api.get(`/volunteers/${userId}`),
        api.get(`/volunteers/${userId}/attendance`),
      ]);
      if (vRes.status === 'fulfilled') setVolunteer(vRes.value.data);
      if (aRes.status === 'fulfilled') setAttendance(aRes.value.data ?? []);
    } catch {
      toast.error('Failed to load volunteer profile');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [userId]);

  async function approve() {
    if (!volunteer) return;
    setActing(true);
    try {
      await api.patch(`/volunteers/${userId}/approve`);
      toast.success(`${volunteer.user.name} approved`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to approve');
    } finally { setActing(false); }
  }

  async function reject() {
    if (!volunteer) return;
    setActing(true);
    try {
      await api.patch(`/volunteers/${userId}/reject`, { reason: reason || 'Does not meet requirements' });
      toast.success(`${volunteer.user.name} rejected`);
      setRejectOpen(false);
      setReason('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to reject');
    } finally { setActing(false); }
  }

  async function putOnHold() {
    if (!volunteer) return;
    setActing(true);
    try {
      await api.patch(`/volunteers/${userId}/reject`, { reason: reason || 'Placed on hold' });
      toast.success(`${volunteer.user.name} placed on hold`);
      setHoldOpen(false);
      setReason('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to put on hold');
    } finally { setActing(false); }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="p-6 text-center py-24 text-slate-400">
        <p>Volunteer not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 text-slate-500">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[#e8f4f9] flex items-center justify-center text-[#3191c2] font-bold text-2xl">
                  {volunteer.user.name[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{volunteer.user.name}</h2>
                  <StatusBadge status={volunteer.accountStatus} />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{volunteer.user.email}</span>
                </div>
                {volunteer.city && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{volunteer.city}</span>
                  </div>
                )}
                {volunteer.organisation && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{volunteer.organisation}</span>
                  </div>
                )}
                {volunteer.domain && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Star className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{volunteer.domain}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Joined {new Date(volunteer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <VerificationBadge label="Safeguarding" status={volunteer.safeguardingStatus} passValue="PASS" />
                <VerificationBadge label="Police Verification" status={volunteer.policeVerification} passValue="VERIFIED" />
              </div>

              {volunteer.skills.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {volunteer.skills.map(s => (
                      <Badge key={s.skill.name} variant="secondary" className="text-xs">{s.skill.name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {canAct && (
                <div className="pt-2 border-t space-y-2">
                  {volunteer.accountStatus === 'PENDING' && (
                    <>
                      <Button
                        className="w-full bg-[#3191c2] hover:bg-[#2a7fa8] text-white gap-2"
                        disabled={acting}
                        onClick={approve}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 gap-2"
                        disabled={acting}
                        onClick={() => { setReason(''); setRejectOpen(true); }}
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </>
                  )}
                  {volunteer.accountStatus === 'ACTIVE' && (
                    <Button
                      variant="outline"
                      className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 gap-2"
                      disabled={acting}
                      onClick={() => { setReason(''); setHoldOpen(true); }}
                    >
                      <PauseCircle className="w-4 h-4" /> Put On Hold
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#e8f4f9] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#3191c2]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{(volunteer.totalHours ?? 0).toFixed(1)}</p>
                  <p className="text-xs text-slate-500">Total Hours</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#e8f4f9] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#3191c2]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{volunteer.sessionsAttended ?? 0}</p>
                  <p className="text-xs text-slate-500">Sessions Attended</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Badges */}
          {volunteer.badges.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#3191c2]" />
                  Badges Earned ({volunteer.badges.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {volunteer.badges.map(({ badge }) => (
                    <div key={badge.name} className="rounded-lg border bg-slate-50 p-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#3191c2] flex items-center justify-center shrink-0">
                        {badge.iconUrl
                          ? <img src={badge.iconUrl} alt={badge.name} className="w-5 h-5 object-contain" />
                          : <Award className="w-4 h-4 text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{badge.name}</p>
                        {badge.description && <p className="text-xs text-slate-500 truncate">{badge.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attendance history */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attendance History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {attendance.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No attendance records yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium text-sm">{record.opportunity.title}</TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(record.opportunity.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{record.opportunity.location}</TableCell>
                        <TableCell className="text-sm">{record.hours ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={record.attended ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500'}>
                            {record.attended ? 'Attended' : 'Absent'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={open => { if (!open) setRejectOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {volunteer.user.name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="e.g. Incomplete information"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white" disabled={acting} onClick={reject}>
                {acting ? 'Rejecting…' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Put on hold dialog */}
      <Dialog open={holdOpen} onOpenChange={open => { if (!open) setHoldOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Put {volunteer.user.name} on hold?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="hold-reason">Reason (optional)</Label>
              <Textarea
                id="hold-reason"
                placeholder="e.g. Background check pending"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setHoldOpen(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" disabled={acting} onClick={putOnHold}>
                {acting ? 'Processing…' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
