'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, Search, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface CCI {
  id: string;
  name: string;
  type: string;
  district: string;
  state: string;
  status: string;
  currentOccupancy: number;
  sanctionedCapacityBoys: number;
  sanctionedCapacityGirls: number;
  _count?: { children: number };
}

const statusColor: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ON_WATCH: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const cciTypeLabel: Record<string, string> = {
  CHILDRENS_HOME: "Children's Home",
  OBSERVATION_HOME: 'Observation Home',
  SPECIAL_HOME: 'Special Home',
  SHELTER_HOME: 'Shelter Home',
};

export default function CCIsPage() {
  const { user } = useAuth();
  const [ccis, setCCIs] = useState<CCI[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ccis').then(r => setCCIs(r.data)).finally(() => setLoading(false));
  }, []);

  const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';
  const filtered = ccis.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Child Care Institutions</h1>
          <p className="text-slate-500 text-sm mt-1">{ccis.length} registered CCIs</p>
        </div>
        {canCreate && (
          <Link href="/ccis/new">
            <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]">
              <Plus className="w-4 h-4 mr-2" /> Register CCI
            </Button>
          </Link>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search by name or district…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No CCIs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cci => (
            <Link key={cci.id} href={`/ccis/${cci.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{cci.name}</CardTitle>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[cci.status] || 'bg-slate-100 text-slate-600'}`}>
                      {cci.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{cciTypeLabel[cci.type] || cci.type}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{cci.district}, {cci.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{cci.currentOccupancy} / {cci.sanctionedCapacityBoys + cci.sanctionedCapacityGirls} occupancy</span>
                  </div>
                  {cci._count && (
                    <p className="text-xs text-slate-400">{cci._count.children} enrolled children</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
