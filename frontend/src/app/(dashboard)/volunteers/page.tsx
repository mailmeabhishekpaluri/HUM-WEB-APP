'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Volunteer {
  id: string;
  userId: string;
  city: string;
  totalHours: number;
  accountStatus: string;
  policeVerification: string;
  safeguardingStatus: string;
  user: { name: string; email: string; mobile: string };
  skills: { skill: { name: string } }[];
  badges: { badge: { name: string } }[];
}

export default function VolunteersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [pending, setPending] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [allRes, pendingRes] = await Promise.all([
        api.get('/volunteers?status=ACTIVE'),
        api.get('/volunteers/pending'),
      ]);
      setVolunteers(allRes.data);
      setPending(pendingRes.data);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function approve(userId: string) {
    try {
      await api.patch(`/volunteers/${userId}/approve`);
      toast({ title: 'Volunteer approved' });
      load();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  async function reject(userId: string) {
    try {
      await api.patch(`/volunteers/${userId}/reject`, { reason: 'Does not meet requirements' });
      toast({ title: 'Volunteer rejected' });
      load();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  const filtered = volunteers.filter(v =>
    !search || v.user.name.toLowerCase().includes(search.toLowerCase()) ||
    v.user.email.includes(search) || (v.city || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Volunteers</h1>
          <p className="text-slate-500 text-sm mt-1">{volunteers.length} active · {pending.length} pending</p>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({volunteers.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending Approval ({pending.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search volunteers…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No active volunteers</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map(v => (
                <Card key={v.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {v.user.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{v.user.name}</p>
                          <p className="text-xs text-slate-400">{v.city} · {v.user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right text-xs">
                          <p className="font-medium">{v.totalHours.toFixed(1)}h</p>
                          <p className="text-slate-400">{v.badges.length} badges</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${v.policeVerification === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {v.policeVerification === 'VERIFIED' ? '✓ Verified' : '⏳ PV Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {v.skills.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {v.skills.slice(0, 4).map(s => (
                          <Badge key={s.skill.name} variant="outline" className="text-xs">{s.skill.name}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pending.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No pending approvals</p></div>
          ) : (
            <div className="space-y-3">
              {pending.map(v => (
                <Card key={v.id}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{v.user.name}</p>
                        <p className="text-sm text-slate-500">{v.user.email} · {v.city}</p>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${v.safeguardingStatus === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            Quiz: {v.safeguardingStatus}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${v.policeVerification === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            PV: {v.policeVerification.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      {(user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER') && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approve(v.userId)}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => reject(v.userId)}>Reject</Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
