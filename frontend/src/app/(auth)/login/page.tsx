'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { HUManityLogo } from '@/components/shared/HUManityLogo';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const userData = await login(identifier, password);
      if (userData.accountStatus === 'PENDING') {
        router.push('/setup');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      toast.error('Login failed', { description: msg });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left branded panel — hidden on mobile, shown on md+ */}
      <div className="hidden md:flex md:w-1/2 bg-[#3191c2] flex-col items-center justify-center p-12 text-white">
        <div className="max-w-sm space-y-6">
          <HUManityLogo size="lg" />
          <div className="space-y-3 pt-4">
            <h2 className="text-2xl font-bold">Integrated Operations Platform</h2>
            <p className="text-blue-100 leading-relaxed">
              Empowering child care institutions across India with streamlined compliance,
              volunteer management, and impact reporting.
            </p>
          </div>
          <div className="pt-6 border-t border-blue-400 space-y-2 text-sm text-blue-100">
            <p className="font-medium text-white">Humanity Uplifting Mankind</p>
            <p>humanityorg.foundation</p>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile-only logo */}
          <div className="flex flex-col items-center gap-3 md:hidden">
            <HUManityLogo size="md" />
            <p className="text-slate-500 text-sm">Integrated Operations Platform</p>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="text-slate-500 text-sm">Welcome back — enter your credentials below</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">Phone number or email</Label>
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="9876543210 or you@humanityorg.foundation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#3191c2] hover:bg-[#2a7fa8] text-white"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">Demo credentials</p>
            <p>Admin: admin@humanityorg.foundation / Admin@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
