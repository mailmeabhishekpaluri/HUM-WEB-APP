'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Opportunity {
  id: string; title: string; programmeArea: string; location: string;
  dateTime: string; durationMinutes: number; requiredCount: number;
  status: string; description?: string; safeguardingLevel: string;
  requiredSkills: { skill: { name: string } }[];
  _count: { registrations: number };
}

const statusColor: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  FULL: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/opportunities').then(r => setOpps(r.data)).finally(() => setLoading(false));
  }, []);

  async function register(oppId: string) {
    try {
      await api.post(`/opportunities/${oppId}/register`);
      toast({ title: 'Registered successfully!' });
      api.get('/opportunities').then(r => setOpps(r.data));
    } catch (err: any) {
      toast({ title: 'Could not register', description: err.response?.data?.error, variant: 'destructive' });
    }
  }

  const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Opportunities</h1>
          <p className="text-slate-500 text-sm mt-1">{opps.filter(o => o.status === 'OPEN').length} open</p>
        </div>
        {canCreate && (
          <Link href="/opportunities/new">
            <Button className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Create</Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : opps.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No open opportunities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opps.map(opp => (
            <Card key={opp.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{opp.title}</CardTitle>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[opp.status] || ''}`}>{opp.status}</span>
                </div>
                <Badge variant="outline" className="text-xs w-fit">{opp.programmeArea.replace('_',' ')}</Badge>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600"><Calendar className="w-3.5 h-3.5" /><span>{new Date(opp.dateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
                <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="w-3.5 h-3.5" /><span className="truncate">{opp.location}</span></div>
                <div className="flex items-center gap-2 text-sm text-slate-600"><Users className="w-3.5 h-3.5" /><span>{opp._count.registrations} / {opp.requiredCount} registered</span></div>
                {opp.requiredSkills.length > 0 && (
                  <div className="flex gap-1 flex-wrap">{opp.requiredSkills.map(s => <Badge key={s.skill.name} variant="secondary" className="text-xs">{s.skill.name}</Badge>)}</div>
                )}
                {opp.description && <p className="text-xs text-slate-500 line-clamp-2">{opp.description}</p>}
                {user?.role === 'VOLUNTEER' && opp.status === 'OPEN' && (
                  <Button size="sm" className="w-full mt-2 bg-orange-500 hover:bg-orange-600" onClick={() => register(opp.id)}>
                    Register
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
