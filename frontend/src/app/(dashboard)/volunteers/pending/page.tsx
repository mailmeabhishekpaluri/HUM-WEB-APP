'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, UserCheck, MapPin, Mail, Calendar, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  formatDate, POLICE_STATUS_LABELS, SAFEGUARDING_STATUS_LABELS, humanize,
} from '@/lib/labels';

interface PendingVolunteer {
  id: string;
  userId: string;
  city: string;
  joinedDate: string;
  safeguardingStatus: string;
  policeVerification: string;
  user: { name: string; email: string };
  skills: { skill: { name: string } }[];
}

function VolunteerSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PendingApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<PendingVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<PendingVolunteer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<PendingVolunteer | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && !['SUPER_ADMIN', 'PROGRAM_MANAGER'].includes(user.role ?? '')) {
      router.push('/dashboard');
    }
  }, [user, router]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/volunteers/pending');
      setVolunteers(res.data);
    } catch {
      toast({ title: 'Failed to load pending volunteers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function removeWithAnimation(userId: string) {
    setLeaving(prev => new Set(prev).add(userId));
    setTimeout(() => {
      setVolunteers(prev => prev.filter(v => v.userId !== userId));
      setLeaving(prev => { const s = new Set(prev); s.delete(userId); return s; });
    }, 350);
  }

  function requestApprove(v: PendingVolunteer) {
    const unqualified =
      v.safeguardingStatus !== 'PASS' || v.policeVerification === 'NOT_SUBMITTED';
    if (unqualified) {
      setConfirmTarget(v);
    } else {
      approve(v);
    }
  }

  async function approve(v: PendingVolunteer) {
    setProcessingId(v.userId);
    try {
      await api.patch(`/volunteers/${v.userId}/approve`);
      toast({ title: `${v.user.name} approved`, description: 'They can now log in as an active volunteer.' });
      setConfirmTarget(null);
      removeWithAnimation(v.userId);
    } catch {
      toast({ title: 'Failed to approve volunteer', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.userId);
    try {
      await api.patch(`/volunteers/${rejectTarget.userId}/reject`, { reason: rejectReason || 'Does not meet requirements' });
      toast({ title: `${rejectTarget.user.name} rejected` });
      removeWithAnimation(rejectTarget.userId);
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      toast({ title: 'Failed to reject volunteer', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  }

  const canAct = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-[#3191c2]" />
          Pending Volunteer Approvals
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {loading ? 'Loading…' : `${volunteers.length} volunteer${volunteers.length === 1 ? '' : 's'} awaiting review`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <VolunteerSkeleton />
          <VolunteerSkeleton />
          <VolunteerSkeleton />
        </div>
      ) : volunteers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-lg font-semibold text-slate-700">No pending approvals 🎉</p>
          <p className="text-slate-400 text-sm mt-1">All volunteers are up to date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {volunteers.map(v => {
            const isLeaving = leaving.has(v.userId);
            const isProcessing = processingId === v.userId;
            return (
              <div
                key={v.userId}
                style={{
                  transition: 'opacity 0.35s ease, transform 0.35s ease',
                  opacity: isLeaving ? 0 : 1,
                  transform: isLeaving ? 'translateX(40px)' : 'translateX(0)',
                }}
              >
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-2 min-w-0">
                        <div>
                          <p className="font-semibold text-slate-900 text-base">{v.user.name}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {v.user.email}
                            </span>
                            {v.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {v.city}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Registered {formatDate(v.joinedDate)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={v.safeguardingStatus === 'PASS'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'}
                          >
                            Quiz: {SAFEGUARDING_STATUS_LABELS[v.safeguardingStatus] ?? humanize(v.safeguardingStatus)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={v.policeVerification === 'VERIFIED'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'}
                          >
                            PV: {POLICE_STATUS_LABELS[v.policeVerification] ?? humanize(v.policeVerification)}
                          </Badge>
                        </div>

                        {v.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {v.skills.map(s => (
                              <Badge key={s.skill.name} variant="secondary" className="text-xs">
                                {s.skill.name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Link
                          href={`/volunteers/${v.userId}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#3191c2] hover:text-[#2a7fa8]"
                        >
                          View full profile
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      {canAct && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-[#3191c2] hover:bg-[#2a7fa8] text-white gap-1.5"
                            disabled={isProcessing}
                            onClick={() => requestApprove(v)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5"
                            disabled={isProcessing}
                            onClick={() => { setRejectTarget(v); setRejectReason(''); }}
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!confirmTarget} onOpenChange={open => { if (!open) setConfirmTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve {confirmTarget?.user.name} anyway?</DialogTitle>
            <DialogDescription>
              This volunteer has not passed the safeguarding quiz. They&apos;ll be restricted to non-CCI activities until it&apos;s passed. Approve anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>Cancel</Button>
            <Button
              className="bg-[#3191c2] hover:bg-[#2a7fa8] text-white"
              disabled={processingId === confirmTarget?.userId}
              onClick={() => confirmTarget && approve(confirmTarget)}
            >
              {processingId === confirmTarget?.userId ? 'Approving…' : 'Approve anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {rejectTarget?.user.name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g. Incomplete information"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                disabled={processingId === rejectTarget?.userId}
                onClick={reject}
              >
                {processingId === rejectTarget?.userId ? 'Rejecting…' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
