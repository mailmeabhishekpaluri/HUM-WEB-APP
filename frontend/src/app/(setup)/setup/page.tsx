'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HUManityLogo } from '@/components/shared/HUManityLogo';
import { Eye, EyeOff } from 'lucide-react';

const DOMAINS = ['Education', 'Healthcare', 'Technology', 'Finance', 'Arts', 'Other'];

const SKILLS = [
  'Teaching', 'Mentoring', 'Medical', 'Photography', 'Event Management',
  'Fundraising', 'Counselling', 'Social Work', 'IT/Technology', 'Arts & Crafts',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function ProgressIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              i + 1 <= step
                ? 'bg-[#3191c2] text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-8 transition-colors ${i + 1 < step ? 'bg-[#3191c2]' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-slate-500">Step {step} of {total}</span>
    </div>
  );
}

function ChangePasswordStep({ onNext }: { onNext: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      toast.success('Password updated.');
      onNext();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current Password</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNext ? 'text' : 'password'}
            value={next}
            onChange={e => setNext(e.target.value)}
            minLength={8}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNext(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-slate-400">Minimum 8 characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#3191c2] hover:bg-[#2a7fa8] text-white mt-2"
      >
        {submitting ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}

function VolunteerProfileStep({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    city: '',
    organisation: '',
    domain: '',
    skills: [] as string[],
    languages: '',
    motivation: '',
    availabilityDays: [] as string[],
    hoursPerWeek: '',
  });

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

  function toggleDay(day: string) {
    setForm(prev => ({
      ...prev,
      availabilityDays: prev.availabilityDays.includes(day)
        ? prev.availabilityDays.filter(d => d !== day)
        : [...prev.availabilityDays, day],
    }));
  }

  const wordCount = form.motivation.trim().split(/\s+/).filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city) {
      toast.error('City is required.');
      return;
    }
    if (wordCount > 200) {
      toast.error('Motivation statement must be 200 words or fewer.');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch('/volunteers/me/profile', {
        city: form.city,
        organisation: form.organisation || undefined,
        professionalDomain: form.domain || undefined,
        skills: form.skills,
        languages: form.languages.split(',').map(l => l.trim()).filter(Boolean),
        motivationStatement: form.motivation || undefined,
        availabilityDays: form.availabilityDays,
        hoursPerWeek: form.hoursPerWeek ? Number(form.hoursPerWeek) : undefined,
      });
      await api.post('/auth/complete-setup');
      toast.success('Profile saved. Welcome!');
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to save profile.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city">City <span className="text-rose-500">*</span></Label>
          <Input id="city" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="organisation">Organisation / College</Label>
          <Input id="organisation" value={form.organisation} onChange={e => set('organisation', e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="domain">Professional Domain</Label>
        <Select value={form.domain} onValueChange={v => set('domain', v)}>
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
          {SKILLS.map(skill => (
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

      <div className="space-y-1.5">
        <Label htmlFor="motivation">
          Motivation Statement
          <span className={`ml-2 text-xs font-normal ${wordCount > 200 ? 'text-rose-500' : 'text-slate-400'}`}>
            {wordCount}/200 words
          </span>
        </Label>
        <Textarea
          id="motivation"
          value={form.motivation}
          onChange={e => set('motivation', e.target.value)}
          placeholder="What motivates you to volunteer with HUManity?"
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>Availability Days</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => (
            <label key={day} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <Checkbox
                checked={form.availabilityDays.includes(day)}
                onCheckedChange={() => toggleDay(day)}
              />
              {day.slice(0, 3)}
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

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-[#3191c2] hover:bg-[#2a7fa8] text-white"
      >
        {submitting ? 'Saving…' : 'Complete Setup'}
      </Button>
    </form>
  );
}

export default function SetupPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const isVolunteer = user?.role === 'VOLUNTEER';
  const totalSteps = isVolunteer ? 2 : 1;

  async function handlePasswordDone() {
    if (isVolunteer) {
      setStep(2);
    } else {
      try {
        await api.post('/auth/complete-setup');
        await refreshUser();
        toast.success('Setup complete. Welcome!');
        router.push('/dashboard');
      } catch {
        toast.error('Failed to complete setup.');
      }
    }
  }

  async function handleProfileDone() {
    await refreshUser();
    router.push('/dashboard');
  }

  const titles = ['Set a New Password', 'Complete Your Profile'];
  const descriptions = [
    'For security, please change your temporary password before continuing.',
    'Tell us a bit about yourself so we can match you with the right opportunities.',
  ];

  return (
    <Card className="w-full max-w-lg shadow-lg border-0">
      <CardHeader className="pb-2 pt-6 px-6">
        <div className="flex justify-center mb-5">
          <HUManityLogo size="md" />
        </div>
        {totalSteps > 1 && <ProgressIndicator step={step} total={totalSteps} />}
        <h1 className="text-xl font-bold text-slate-900">{titles[step - 1]}</h1>
        <p className="text-sm text-slate-500 mt-1">{descriptions[step - 1]}</p>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
        {step === 1 && <ChangePasswordStep onNext={handlePasswordDone} />}
        {step === 2 && isVolunteer && <VolunteerProfileStep onDone={handleProfileDone} />}
      </CardContent>
    </Card>
  );
}
