'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Plus, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Child {
  id: string; childId: string; firstName: string; lastName?: string;
  dateOfBirth: string; gender: string; isActive: boolean;
  cci: { id: string; name: string; };
}

interface CCI {
  id: string; name: string;
}

export default function ChildrenPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [ccis, setCcis] = useState<CCI[]>([]);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterCci, setFilterCci] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'].includes(user.role ?? '')) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    Promise.all([api.get('/children'), api.get('/ccis')]).then(([cr, ccir]) => {
      setChildren(Array.isArray(cr.data) ? cr.data : cr.data?.data || []);
      setCcis(Array.isArray(ccir.data) ? ccir.data : ccir.data?.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const canCreate = ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'].includes(user?.role || '');

  function getAge(dob: string) {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  const filtered = children.filter(c => {
    const name = `${c.firstName} ${c.lastName || ''}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase()) || c.childId.includes(search);
    const matchGender = !filterGender || c.gender === filterGender;
    const matchCci = !filterCci || c.cci?.id === filterCci;
    return matchSearch && matchGender && matchCci;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Children</h1>
          <p className="text-slate-500 text-sm mt-1">{children.length} enrolled</p>
        </div>
        {canCreate && (
          <Link href="/children/new">
            <Button className="bg-[#3191c2] hover:bg-[#2a7fa8]">
              <Plus className="w-4 h-4 mr-2" /> Add Child
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        Child data is protected. All access is logged. Handle with care per POCSO Act 2012.
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select onValueChange={v => setFilterCci((v as string) === '__all__' ? '' : v as string)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All CCIs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All CCIs</SelectItem>
            {ccis.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select onValueChange={v => setFilterGender((v as string) === '__all__' ? '' : v as string)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All genders" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All genders</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No children found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Link key={c.id} href={`/children/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm ${c.gender === 'FEMALE' ? 'bg-pink-400' : c.gender === 'MALE' ? 'bg-blue-400' : 'bg-slate-400'}`}>
                      {c.firstName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-slate-400">{c.childId} · {getAge(c.dateOfBirth)} yrs · {c.cci?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{c.gender}</Badge>
                    <Badge className={`text-xs ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
