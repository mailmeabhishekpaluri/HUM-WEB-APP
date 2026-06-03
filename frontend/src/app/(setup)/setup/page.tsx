'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { HUManityLogo } from '@/components/shared/HUManityLogo';
import { Eye, EyeOff } from 'lucide-react';

export default function SetupPage() {
  const { refreshUser } = useAuth();
  const router = useRouter();

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
      await api.post('/auth/complete-setup');
      await refreshUser();
      toast.success('Setup complete. Welcome!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-lg border-0">
      <CardHeader className="pb-2 pt-6 px-6">
        <div className="flex justify-center mb-5">
          <HUManityLogo size="md" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Change your password</h1>
        <p className="text-sm text-slate-500 mt-1">Set a new password to secure your account.</p>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-4">
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
            {submitting ? 'Saving…' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
