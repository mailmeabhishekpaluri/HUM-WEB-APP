'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCog, UserPlus, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  PROGRAM_MANAGER: 'Program Manager',
  CCI_MANAGER: 'CCI Manager',
  CCI_STAFF: 'CCI Staff',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  PROGRAM_MANAGER: 'bg-blue-100 text-blue-700 border-blue-200',
  CCI_MANAGER: 'bg-teal-100 text-teal-700 border-teal-200',
  CCI_STAFF: 'bg-slate-100 text-slate-700 border-slate-200',
};

function InviteDialog({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.role || form.password.length < 8) {
      toast({ title: 'Please fill all fields. Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/users', form);
      toast({ title: 'Team member invited', description: `${form.name} can now log in.` });
      setForm({ name: '', email: '', role: '', password: '' });
      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: msg || 'Failed to invite team member', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#3191c2] hover:bg-[#2a7fa8] text-white gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Select value={form.role} onValueChange={v => set('role', v)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROGRAM_MANAGER">Program Manager</SelectItem>
                <SelectItem value="CCI_MANAGER">CCI Manager</SelectItem>
                <SelectItem value="CCI_STAFF">CCI Staff</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Temporary Password</Label>
            <Input
              id="password"
              type="text"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="bg-[#3191c2] hover:bg-[#2a7fa8] text-white">
              {submitting ? 'Inviting…' : 'Send Invite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  async function load() {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await api.get('/auth/users');
      setMembers(res.data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deactivate(id: string, name: string) {
    try {
      await api.patch(`/auth/users/${id}/deactivate`);
      toast({ title: `${name} deactivated` });
      load();
    } catch {
      toast({ title: 'Failed to deactivate user', variant: 'destructive' });
    }
  }

  if (me?.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">Access restricted to Super Admins.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[#3191c2]" />
            Team Members
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage staff accounts — volunteers self-register separately.</p>
        </div>
        <InviteDialog onSuccess={load} />
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Joined</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>
                </tr>
              ))
            ) : fetchError ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  <p>Invited team members will appear here after they log in.</p>
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  <UserCog className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No team members yet. Use "Invite Team Member" to get started.</p>
                </td>
              </tr>
            ) : (
              members.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#e8f4f9] flex items-center justify-center text-[#3191c2] text-xs font-bold">
                        {m.name[0]?.toUpperCase()}
                      </div>
                      {m.name}
                      {m.id === me?.id && <span className="text-xs text-slate-400">(you)</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${ROLE_COLORS[m.role] ?? ''}`}>
                      {ROLE_LABELS[m.role] ?? m.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {m.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(m.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.id !== me?.id && m.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => deactivate(m.id, m.name)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
