'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Search, CheckCircle, Share2, Clock, PauseCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

const REGISTRATION_LINK = 'https://hum-web-app.vercel.app/volunteer/register';

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
  const [onHold, setOnHold] = useState<Volunteer[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [allRes, pendingRes, holdRes] = await Promise.all([
        api.get('/volunteers?status=ACTIVE'),
        api.get('/volunteers/pending'),
        api.get('/volunteers?status=ON_HOLD').catch(() => ({ data: [] })),
      ]);
      setVolunteers(allRes.data);
      setPendingCount(Array.isArray(pendingRes.data) ? pendingRes.data.length : 0);
      setOnHold(holdRes.data);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function copyLink() {
    navigator.clipboard.writeText(REGISTRATION_LINK).then(() => {
      sonnerToast.success('Link copied!', { description: REGISTRATION_LINK });
    }).catch(() => {
      sonnerToast.error('Could not copy link');
    });
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
          <p className="text-slate-500 text-sm mt-1">{volunteers.length} active · {pendingCount} pending</p>
        </div>
        <Button
          variant="outline"
          className="gap-2 border-[#3191c2] text-[#3191c2] hover:bg-[#e8f4f9]"
          onClick={copyLink}
        >
          <Share2 className="w-4 h-4" />
          Share Registration Link
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <CheckCircle className="w-3.5 h-3.5" />
            Active ({volunteers.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-3.5 h-3.5" />
            Pending
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="onhold" className="gap-2">
            <PauseCircle className="w-3.5 h-3.5" />
            On Hold ({onHold.length})
          </TabsTrigger>
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
          <div className="rounded-lg border bg-amber-50 border-amber-200 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900">
                {pendingCount > 0 ? `${pendingCount} volunteer${pendingCount === 1 ? '' : 's'} awaiting approval` : 'No pending approvals right now'}
              </p>
              <p className="text-sm text-amber-700 mt-0.5">Review and approve or reject each application from the approvals queue.</p>
            </div>
            <Link href="/volunteers/pending">
              <Button className="bg-[#3191c2] hover:bg-[#2a7fa8] text-white gap-2 shrink-0">
                Go to Approvals
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="onhold" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : onHold.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><PauseCircle className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No volunteers on hold</p></div>
          ) : (
            <div className="space-y-2">
              {onHold.map(v => (
                <Card key={v.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
                        {v.user.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{v.user.name}</p>
                        <p className="text-xs text-slate-400">{v.city} · {v.user.email}</p>
                      </div>
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
