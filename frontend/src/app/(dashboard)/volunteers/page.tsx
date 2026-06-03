'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Users, Search, CheckCircle, Clock, PauseCircle, ArrowRight, ExternalLink,
} from 'lucide-react';
import {
  POLICE_STATUS_LABELS, SAFEGUARDING_STATUS_LABELS, humanize,
} from '@/lib/labels';

interface Volunteer {
  id: string;
  userId: string;
  city: string;
  totalHours: number;
  joinedDate: string;
  accountStatus: string;
  policeVerification: string;
  safeguardingStatus: string;
  user: { name: string; email: string; mobile: string };
  skills: { skill: { name: string } }[];
  badges: { badge: { name: string } }[];
}

function QuizBadge({ status }: { status: string }) {
  const passed = status === 'PASS';
  return (
    <Badge variant="outline" className={passed ? 'bg-green-50 text-green-700 border-green-200 text-xs' : 'bg-slate-50 text-slate-500 border-slate-200 text-xs'}>
      {SAFEGUARDING_STATUS_LABELS[status] ?? humanize(status)}
    </Badge>
  );
}

function PoliceBadge({ status }: { status: string }) {
  const verified = status === 'VERIFIED';
  return (
    <Badge variant="outline" className={verified ? 'bg-green-50 text-green-700 border-green-200 text-xs' : 'bg-amber-50 text-amber-700 border-amber-200 text-xs'}>
      {POLICE_STATUS_LABELS[status] ?? humanize(status)}
    </Badge>
  );
}

export default function VolunteersPage() {
  const router = useRouter();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [onHold, setOnHold] = useState<Volunteer[]>([]);
  const [pending, setPending] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const pendingCount = pending.length;

  async function load() {
    try {
      const [allRes, pendingRes, holdRes] = await Promise.all([
        api.get('/volunteers?status=ACTIVE'),
        api.get('/volunteers/pending'),
        api.get('/volunteers?status=ON_HOLD').catch(() => ({ data: [] })),
      ]);
      setVolunteers(allRes.data);
      setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      setOnHold(holdRes.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = volunteers.filter(v =>
    !search ||
    v.user.name.toLowerCase().includes(search.toLowerCase()) ||
    v.user.email.toLowerCase().includes(search.toLowerCase())
  );

  function SkeletonRows() {
    return (
      <>
        {[1, 2, 3, 4].map(i => (
          <TableRow key={i}>
            {[1, 2, 3, 4, 5, 6, 7].map(j => (
              <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
            ))}
          </TableRow>
        ))}
      </>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Volunteers</h1>
          <p className="text-slate-500 text-sm mt-1">{volunteers.length} active · {pendingCount} pending</p>
        </div>
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
            <Input
              className="pl-9"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Police</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <SkeletonRows />
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="text-center py-12 text-slate-400">
                        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>{search ? 'No volunteers match your search' : 'No active volunteers'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(v => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => router.push(`/volunteers/${v.userId}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#e8f4f9] flex items-center justify-center text-[#3191c2] font-semibold text-xs shrink-0">
                            {v.user.name[0]}
                          </div>
                          <span className="font-medium text-sm text-slate-900">{v.user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{v.user.email}</TableCell>
                      <TableCell className="text-sm text-slate-600">{v.city || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {v.skills.slice(0, 2).map(s => (
                            <Badge key={s.skill.name} variant="secondary" className="text-xs">{s.skill.name}</Badge>
                          ))}
                          {v.skills.length > 2 && (
                            <span className="text-xs text-slate-400">+{v.skills.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{v.totalHours.toFixed(1)}h</TableCell>
                      <TableCell><QuizBadge status={v.safeguardingStatus} /></TableCell>
                      <TableCell><PoliceBadge status={v.policeVerification} /></TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Link href={`/volunteers/${v.userId}`}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-[#3191c2]">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              {pendingCount > 0
                ? `${pendingCount} volunteer${pendingCount === 1 ? '' : 's'} awaiting approval`
                : 'No pending approvals right now'}
            </p>
            <Link href="/volunteers/pending">
              <Button size="sm" variant="outline" className="gap-2 shrink-0">
                Go to Approvals queue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Police</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <SkeletonRows />
                ) : pending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="text-center py-12 text-slate-400">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No pending volunteers</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map(v => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => router.push(`/volunteers/${v.userId}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#e8f4f9] flex items-center justify-center text-[#3191c2] font-semibold text-xs shrink-0">
                            {v.user.name[0]}
                          </div>
                          <span className="font-medium text-sm text-slate-900">{v.user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{v.user.email}</TableCell>
                      <TableCell className="text-sm text-slate-600">{v.city || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {v.skills.slice(0, 2).map(s => (
                            <Badge key={s.skill.name} variant="secondary" className="text-xs">{s.skill.name}</Badge>
                          ))}
                          {v.skills.length > 2 && (
                            <span className="text-xs text-slate-400">+{v.skills.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><QuizBadge status={v.safeguardingStatus} /></TableCell>
                      <TableCell><PoliceBadge status={v.policeVerification} /></TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Link href={`/volunteers/${v.userId}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[#3191c2] hover:text-[#2a7fa8] gap-1">
                            Review
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="onhold" className="mt-4">
          {loading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}</div>
          ) : onHold.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <PauseCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No volunteers on hold</p>
            </div>
          ) : (
            <div className="space-y-2">
              {onHold.map(v => (
                <Card
                  key={v.id}
                  className="hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => router.push(`/volunteers/${v.userId}`)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm">
                        {v.user.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{v.user.name}</p>
                        <p className="text-xs text-slate-400">{v.city} · {v.user.email}</p>
                      </div>
                      <Link href={`/volunteers/${v.userId}`} onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-[#3191c2]">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
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
