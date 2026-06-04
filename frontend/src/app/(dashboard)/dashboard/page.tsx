'use client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Building2, Heart, Users, BarChart3, Clock, Award, CalendarCheck, Bell, AlertCircle, Trophy, ArrowRight, UserCheck, CheckCircle2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { PROGRAMME_LABELS, PROGRAMME_OPTIONS, humanize, formatDate } from '@/lib/labels';
import { ProgrammeTiles } from '@/components/shared/ProgrammeTiles';

interface Summary {
  cciCount: number;
  childCount: number;
  volunteerCount: number;
  pendingVolunteers: number;
  complianceScore: number;
  upcomingDeadlines: { id: string; title: string; dueDate: string; cciName: string; severity: string }[];
  recentActivity: { id: string; message: string; timestamp: string; type: string }[];
}

interface VolunteerProfile {
  id: string;
  totalHours: number;
  sessionsAttended?: number;
  badges: { id: string; name: string; iconUrl?: string; awardedAt: string }[];
  user: { name: string; email: string };
  city?: string | null;
  professionalDomain?: string | null;
  organisation?: string | null;
  languages?: string[] | null;
  availabilityDays?: number[] | null;
  hoursPerWeek?: number | null;
  preferredProgrammes?: string[] | null;
  motivationStatement?: string | null;
  emergencyContact?: string | null;
  skills?: { id?: string; name: string }[] | null;
}

const DOMAINS = ['Education', 'Healthcare', 'Technology', 'Finance', 'Arts', 'Other'];

const SKILL_OPTIONS = [
  'Teaching', 'Mentoring', 'Medical', 'Photography', 'Event Management',
  'Fundraising', 'Counselling', 'Social Work', 'IT/Technology', 'Arts & Crafts',
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Opportunity {
  id: string;
  title: string;
  date: string;
  programme?: string;
  cci: { name: string };
  spotsLeft: number;
}

function StatSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

function AdminDashboard({ summary, loading }: { summary: Summary | null; loading: boolean }) {
  return (
    <>
      <ProgrammeTiles />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total CCIs</CardTitle>
                <Building2 className="w-4 h-4 text-[#3191c2]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.cciCount ?? '—'}</div>
                <p className="text-xs text-slate-500 mt-1">Active institutions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Children</CardTitle>
                <Heart className="w-4 h-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.childCount ?? '—'}</div>
                <p className="text-xs text-slate-500 mt-1">Currently enrolled</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Volunteers</CardTitle>
                <Users className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.volunteerCount ?? '—'}</div>
                <p className="text-xs text-slate-500 mt-1">Registered volunteers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Pending Approvals</CardTitle>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.pendingVolunteers ?? '—'}</div>
                <p className="text-xs text-slate-500 mt-1">Awaiting review</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Compliance Score</CardTitle>
                <BarChart3 className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.complianceScore != null ? `${summary.complianceScore}%` : '—'}
                </div>
                <p className="text-xs text-slate-500 mt-1">CCIs fully compliant</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex items-center justify-between flex-row">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-amber-500" />
              Upcoming Compliance Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !summary?.upcomingDeadlines?.length ? (
              <p className="text-sm text-slate-400 italic">No upcoming deadlines</p>
            ) : (
              <div className="space-y-2">
                {summary.upcomingDeadlines.map(d => (
                  <div key={d.id} className="flex items-start justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-slate-400">{d.cciName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{new Date(d.dueDate).toLocaleDateString()}</p>
                      <Badge
                        variant="outline"
                        className={
                          d.severity === 'HIGH'
                            ? 'border-red-300 text-red-600 text-xs'
                            : d.severity === 'MEDIUM'
                            ? 'border-amber-300 text-amber-600 text-xs'
                            : 'border-slate-300 text-slate-500 text-xs'
                        }
                      >
                        {d.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#3191c2]" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : !summary?.recentActivity?.length ? (
              <p className="text-sm text-slate-400 italic">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {summary.recentActivity.map(a => (
                  <div key={a.id} className="flex items-start gap-2 py-1 border-b last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3191c2] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm">{a.message}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(a.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Getting Started</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>1. Register your CCIs in the <strong>CCIs</strong> section</p>
            <p>2. Add children to each CCI</p>
            <p>3. Onboard volunteers and create opportunities</p>
            <p>4. Log visits and track compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/ccis/new" className="block text-sm text-[#3191c2] hover:underline">+ Register new CCI</Link>
            <Link href="/children/new" className="block text-sm text-[#3191c2] hover:underline">+ Add child profile</Link>
            <Link href="/opportunities/new" className="block text-sm text-[#3191c2] hover:underline">+ Create volunteer opportunity</Link>
            <Link href="/reports" className="block text-sm text-[#3191c2] hover:underline">→ Generate reports</Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

const PROFILE_CHECKS: { key: string; filled: (p: VolunteerProfile) => boolean }[] = [
  { key: 'city', filled: p => !!p.city?.trim() },
  { key: 'professionalDomain', filled: p => !!p.professionalDomain?.trim() },
  { key: 'organisation', filled: p => !!p.organisation?.trim() },
  { key: 'languages', filled: p => !!p.languages?.length },
  { key: 'availabilityDays', filled: p => !!p.availabilityDays?.length },
  { key: 'hoursPerWeek', filled: p => p.hoursPerWeek != null && p.hoursPerWeek > 0 },
  { key: 'preferredProgrammes', filled: p => !!p.preferredProgrammes?.length },
  { key: 'motivationStatement', filled: p => !!p.motivationStatement?.trim() },
  { key: 'emergencyContact', filled: p => !!p.emergencyContact?.trim() },
  { key: 'skills', filled: p => !!p.skills?.length },
];

function computeCompletion(p: VolunteerProfile | null): number {
  if (!p) return 0;
  const done = PROFILE_CHECKS.filter(c => c.filled(p)).length;
  return Math.round((done / PROFILE_CHECKS.length) * 100);
}

function ProfileEditorDialog({
  open, onOpenChange, profile, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: VolunteerProfile | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    city: '',
    organisation: '',
    professionalDomain: '',
    skills: [] as string[],
    languages: '',
    availabilityDays: [] as number[],
    hoursPerWeek: '',
    preferredProgrammes: [] as string[],
    motivationStatement: '',
    emergencyContact: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setForm({
        city: profile.city ?? '',
        organisation: profile.organisation ?? '',
        professionalDomain: profile.professionalDomain ?? '',
        skills: profile.skills?.map(s => s.name) ?? [],
        languages: profile.languages?.join(', ') ?? '',
        availabilityDays: profile.availabilityDays ?? [],
        hoursPerWeek: profile.hoursPerWeek != null ? String(profile.hoursPerWeek) : '',
        preferredProgrammes: profile.preferredProgrammes ?? [],
        motivationStatement: profile.motivationStatement ?? '',
        emergencyContact: profile.emergencyContact ?? '',
      });
    }
  }, [open, profile]);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleSkill(skill: string) {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill],
    }));
  }

  function toggleDay(day: number) {
    setForm(prev => ({
      ...prev,
      availabilityDays: prev.availabilityDays.includes(day)
        ? prev.availabilityDays.filter(d => d !== day)
        : [...prev.availabilityDays, day],
    }));
  }

  function toggleProgramme(value: string) {
    setForm(prev => ({
      ...prev,
      preferredProgrammes: prev.preferredProgrammes.includes(value)
        ? prev.preferredProgrammes.filter(p => p !== value)
        : [...prev.preferredProgrammes, value],
    }));
  }

  const wordCount = form.motivationStatement.trim().split(/\s+/).filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wordCount > 200) {
      toast.error('Motivation statement must be 200 words or fewer.');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch('/volunteers/me/profile', {
        city: form.city,
        organisation: form.organisation,
        professionalDomain: form.professionalDomain,
        skills: form.skills,
        languages: form.languages.split(',').map(l => l.trim()).filter(Boolean),
        availabilityDays: form.availabilityDays,
        hoursPerWeek: form.hoursPerWeek ? Number(form.hoursPerWeek) : undefined,
        preferredProgrammes: form.preferredProgrammes,
        motivationStatement: form.motivationStatement,
        emergencyContact: form.emergencyContact,
      });
      toast.success('Profile saved');
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save profile.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Tell us about yourself so we can match you with the right opportunities.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organisation">Organisation / College</Label>
              <Input id="organisation" value={form.organisation} onChange={e => set('organisation', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="domain">Professional Domain</Label>
            <Select value={form.professionalDomain} onValueChange={v => set('professionalDomain', v)}>
              <SelectTrigger id="domain">
                <SelectValue placeholder="Select domain…" />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_OPTIONS.map(skill => (
                <label key={skill} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.skills.includes(skill)}
                    onCheckedChange={() => toggleSkill(skill)}
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="languages">Languages Spoken</Label>
            <Input
              id="languages"
              value={form.languages}
              onChange={e => set('languages', e.target.value)}
              placeholder="English, Hindi, Marathi"
            />
            <p className="text-xs text-slate-400">Comma-separated</p>
          </div>

          <div className="space-y-2">
            <Label>Availability Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((day, i) => (
                <label key={day} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.availabilityDays.includes(i)}
                    onCheckedChange={() => toggleDay(i)}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hours">Hours per Week</Label>
            <Input
              id="hours"
              type="number"
              min={1}
              max={168}
              value={form.hoursPerWeek}
              onChange={e => set('hoursPerWeek', e.target.value)}
              placeholder="e.g. 5"
              className="max-w-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Programmes</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROGRAMME_OPTIONS.map(p => (
                <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.preferredProgrammes.includes(p.value)}
                    onCheckedChange={() => toggleProgramme(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivation">
              Motivation Statement
              <span className={`ml-2 text-xs font-normal ${wordCount > 200 ? 'text-rose-500' : 'text-slate-400'}`}>
                {wordCount}/200 words
              </span>
            </Label>
            <Textarea
              id="motivation"
              value={form.motivationStatement}
              onChange={e => set('motivationStatement', e.target.value)}
              placeholder="What motivates you to volunteer with HUManity?"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emergency">Emergency Contact</Label>
            <Input
              id="emergency"
              value={form.emergencyContact}
              onChange={e => set('emergencyContact', e.target.value)}
              placeholder="Name & phone number"
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#3191c2] hover:bg-[#2a7fa8] text-white"
            >
              {submitting ? 'Saving…' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProfileCompletionTile({ profile, loading, onComplete }: {
  profile: VolunteerProfile | null;
  loading: boolean;
  onComplete: () => void;
}) {
  const pct = computeCompletion(profile);
  const complete = pct >= 100;

  return (
    <Card className={complete ? 'border-green-200 bg-green-50/40' : 'border-[#3191c2]/30'}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#3191c2]" />
          Profile Completion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Skeleton className="h-10 w-full" />
        ) : complete ? (
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">Profile complete ✓</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Profile {pct}% complete</span>
            </div>
            <Progress value={pct} className="[&_[data-slot=progress-indicator]]:bg-[#3191c2]" />
            <p className="text-xs text-slate-500">
              Recommended: complete your profile within the first 3 days
            </p>
            <Button
              size="sm"
              onClick={onComplete}
              className="bg-[#3191c2] hover:bg-[#2a7fa8] text-white"
            >
              Complete Profile
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VolunteerDashboard() {
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  async function fetchProfile() {
    try {
      const res = await api.get('/volunteers/me');
      setProfile(res.data);
    } catch {
      toast.error('Failed to load your profile');
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/volunteers/me'),
      api.get('/opportunities?status=OPEN'),
    ])
      .then(([profileRes, oppRes]) => {
        setProfile(profileRes.data);
        setOpportunities(oppRes.data?.data ?? oppRes.data ?? []);
      })
      .catch(() => toast.error('Failed to load your dashboard'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <ProfileCompletionTile
        profile={profile}
        loading={loading}
        onComplete={() => setEditorOpen(true)}
      />
      <ProfileEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        profile={profile}
        onSaved={fetchProfile}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Hours</CardTitle>
                <Clock className="w-4 h-4 text-[#3191c2]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile?.totalHours != null ? `${profile.totalHours.toFixed(1)}h` : '—'}
                </div>
                <p className="text-xs text-slate-500 mt-1">Volunteer hours logged</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Sessions Attended</CardTitle>
                <CalendarCheck className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.sessionsAttended ?? 0}</div>
                <p className="text-xs text-slate-500 mt-1">Completed sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Badges Earned</CardTitle>
                <Award className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.badges?.length ?? 0}</div>
                <p className="text-xs text-slate-500 mt-1">Recognition badges</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            My Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex gap-3 flex-wrap">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-24 rounded-xl" />)}
            </div>
          ) : !profile?.badges?.length ? (
            <p className="text-sm text-slate-400 italic">No badges yet — keep volunteering!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {profile.badges.map(b => (
                <div
                  key={b.id}
                  className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-center"
                >
                  {b.iconUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={b.iconUrl} alt={b.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <Award className="w-8 h-8 text-amber-500" />
                  )}
                  <span className="text-xs font-medium text-amber-800 leading-tight">{b.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#3191c2]" />
            Browse Opportunities
          </CardTitle>
          <Link href="/opportunities">
            <Button size="sm" variant="outline" className="text-[#3191c2] border-[#3191c2]">
              Register <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !opportunities.length ? (
            <p className="text-sm text-slate-400 italic">No open opportunities right now</p>
          ) : (
            <div className="space-y-2">
              {opportunities.slice(0, 6).map(op => (
                <Link
                  key={op.id}
                  href="/opportunities"
                  className="flex items-start justify-between gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors border-b last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{op.title}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {op.cci?.name}
                      {op.programme ? ` · ${PROGRAMME_LABELS[op.programme] ?? humanize(op.programme)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{formatDate(op.date)}</p>
                    <Badge variant="outline" className="text-xs border-green-300 text-green-600">
                      {op.spotsLeft} spots left
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/opportunities">
          <Card className="hover:shadow-sm hover:border-[#3191c2] transition-all cursor-pointer h-full">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="w-10 h-10 rounded-full bg-[#e8f4f9] flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5 text-[#3191c2]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">My Opportunities</p>
                <p className="text-xs text-slate-500">View and manage your registrations</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/leaderboard">
          <Card className="hover:shadow-sm hover:border-[#3191c2] transition-all cursor-pointer h-full">
            <CardContent className="flex items-center gap-3 py-5">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Leaderboard</p>
                <p className="text-xs text-slate-500">See how you rank among volunteers</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const isVolunteer = user?.role === 'VOLUNTEER';

  useEffect(() => {
    if (isVolunteer) {
      setLoading(false);
      return;
    }
    api
      .get('/dashboard/summary')
      .then(r => setSummary(r.data))
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, [isVolunteer]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          HUManity Foundation — Integrated Operations Platform
        </p>
      </div>

      {isVolunteer ? (
        <VolunteerDashboard />
      ) : (
        <AdminDashboard summary={summary} loading={loading} />
      )}
    </div>
  );
}
