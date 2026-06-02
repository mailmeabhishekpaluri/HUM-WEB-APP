'use client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Heart, Users, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Stats {
  totalCCIs?: number;
  totalChildren?: number;
  totalVolunteers?: number;
  complianceScore?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          HUManity Foundation — Integrated Operations Platform
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total CCIs</CardTitle>
            <Building2 className="w-4 h-4 text-[#3191c2]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCCIs ?? '—'}</div>
            <p className="text-xs text-slate-500 mt-1">Active institutions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Children</CardTitle>
            <Heart className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChildren ?? '—'}</div>
            <p className="text-xs text-slate-500 mt-1">Currently enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Volunteers</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVolunteers ?? '—'}</div>
            <p className="text-xs text-slate-500 mt-1">Active volunteers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Compliance</CardTitle>
            <BarChart3 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.complianceScore != null ? `${stats.complianceScore}%` : '—'}
            </div>
            <p className="text-xs text-slate-500 mt-1">CCIs fully compliant</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Getting Started</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>1. Register your CCIs in the <strong>CCIs</strong> section</p>
            <p>2. Add children to each CCI</p>
            <p>3. Onboard volunteers and create opportunities</p>
            <p>4. Log visits and track compliance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <a href="/ccis/new" className="block text-sm text-[#3191c2] hover:underline">+ Register new CCI</a>
            <a href="/children/new" className="block text-sm text-[#3191c2] hover:underline">+ Add child profile</a>
            <a href="/opportunities/new" className="block text-sm text-[#3191c2] hover:underline">+ Create volunteer opportunity</a>
            <a href="/reports" className="block text-sm text-[#3191c2] hover:underline">→ Generate reports</a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
