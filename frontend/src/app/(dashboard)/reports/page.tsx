'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, FileText, Users, Building2 } from 'lucide-react';

interface CCI {
  id: string;
  name: string;
}

type ReportType = 'beneficiary' | 'volunteer-hours' | 'compliance' | 'attendance';

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(r => Object.values(r).join(','));
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
}

export default function ReportsPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [ccis, setCcis] = useState<CCI[]>([]);

  // Per-report filters
  const [beneficiaryMonth, setBeneficiaryMonth] = useState('');
  const [beneficiaryCCI, setBeneficiaryCCI] = useState('all');
  const [attendanceFrom, setAttendanceFrom] = useState('');
  const [attendanceTo, setAttendanceTo] = useState('');
  const [attendanceCCI, setAttendanceCCI] = useState('all');
  const [volFrom, setVolFrom] = useState('');
  const [volTo, setVolTo] = useState('');

  // Report results
  const [beneficiaryData, setBeneficiaryData] = useState<any>(null);
  const [volunteerData, setVolunteerData] = useState<any>(null);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);

  useEffect(() => {
    api.get('/ccis?limit=200').then(r => {
      const rows = r.data?.data ?? r.data ?? [];
      setCcis(rows);
    }).catch(() => {});
  }, []);

  async function runReport(type: ReportType) {
    setLoading(type);
    try {
      if (type === 'beneficiary') {
        const params = new URLSearchParams();
        if (beneficiaryMonth) params.set('month', beneficiaryMonth);
        if (beneficiaryCCI && beneficiaryCCI !== 'all') params.set('cciId', beneficiaryCCI);
        const { data } = await api.get(`/reports/beneficiary${params.toString() ? '?' + params.toString() : ''}`);
        setBeneficiaryData(data);
      } else if (type === 'attendance') {
        const params = new URLSearchParams();
        if (attendanceFrom) params.set('from', attendanceFrom);
        if (attendanceTo) params.set('to', attendanceTo);
        if (attendanceCCI && attendanceCCI !== 'all') params.set('cciId', attendanceCCI);
        const { data } = await api.get(`/reports/attendance${params.toString() ? '?' + params.toString() : ''}`);
        setAttendanceData(data);
      } else if (type === 'volunteer-hours') {
        const params = new URLSearchParams();
        if (volFrom) params.set('from', volFrom);
        if (volTo) params.set('to', volTo);
        const { data } = await api.get(`/reports/volunteer-hours${params.toString() ? '?' + params.toString() : ''}`);
        setVolunteerData(data);
      } else if (type === 'compliance') {
        const { data } = await api.get('/reports/compliance');
        setComplianceData(data);
      }
      toast.success('Report generated');
    } catch {
      toast.error('Error generating report');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and export data reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Beneficiary Register */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-500" />
              Monthly Beneficiary Register
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Sex-disaggregated beneficiary counts per CCI</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Month</Label>
                <Input
                  type="month"
                  className="text-sm"
                  value={beneficiaryMonth}
                  onChange={e => setBeneficiaryMonth(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CCI</Label>
                <Select value={beneficiaryCCI} onValueChange={setBeneficiaryCCI}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="All CCIs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All CCIs</SelectItem>
                    {ccis.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-[#3191c2] hover:bg-[#2a7fa8] w-full"
              onClick={() => runReport('beneficiary')}
              disabled={loading === 'beneficiary'}
            >
              {loading === 'beneficiary' ? 'Generating…' : 'Generate'}
            </Button>
            {loading === 'beneficiary' && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}
            {beneficiaryData && loading !== 'beneficiary' && (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded p-2">
                    <p className="font-bold text-lg">{beneficiaryData.totalChildren ?? beneficiaryData.total ?? 0}</p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <p className="font-bold text-lg">{beneficiaryData.byGender?.male ?? 0}</p>
                    <p className="text-xs text-slate-500">Male</p>
                  </div>
                  <div className="bg-pink-50 rounded p-2">
                    <p className="font-bold text-lg">{beneficiaryData.byGender?.female ?? 0}</p>
                    <p className="text-xs text-slate-500">Female</p>
                  </div>
                </div>
                {(beneficiaryData.byCCI?.length > 0 || beneficiaryData.data?.length > 0) && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {(beneficiaryData.byCCI ?? beneficiaryData.data ?? []).map((c: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                        <span className="font-medium">{c.cciName ?? c.name}</span>
                        <span className="text-slate-500">{c.total}  ({c.male}M / {c.female}F)</span>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => exportCSV(beneficiaryData.byCCI ?? beneficiaryData.data ?? [], 'beneficiary-report.csv')}
                >
                  <Download className="w-3.5 h-3.5 mr-2" />Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-green-500" />
              Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Attendance rates per child with date range filter</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" className="text-sm" value={attendanceFrom} onChange={e => setAttendanceFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" className="text-sm" value={attendanceTo} onChange={e => setAttendanceTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CCI</Label>
              <Select value={attendanceCCI} onValueChange={setAttendanceCCI}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All CCIs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All CCIs</SelectItem>
                  {ccis.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="bg-[#3191c2] hover:bg-[#2a7fa8] w-full"
              onClick={() => runReport('attendance')}
              disabled={loading === 'attendance'}
            >
              {loading === 'attendance' ? 'Generating…' : 'Generate'}
            </Button>
            {loading === 'attendance' && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}
            {attendanceData && loading !== 'attendance' && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{attendanceData.totalChildren ?? attendanceData.total ?? (attendanceData.data?.length ?? 0)} children</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(attendanceData.data ?? []).slice(0, 10).map((c: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className={`font-medium ${c.attendanceRate >= 95 ? 'text-green-600' : c.attendanceRate >= 75 ? 'text-amber-500' : 'text-red-600'}`}>
                        {c.attendanceRate}%
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => exportCSV(attendanceData.data ?? [], 'attendance-summary.csv')}
                >
                  <Download className="w-3.5 h-3.5 mr-2" />Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Volunteer Hours Report */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Volunteer Hours Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Hours logged per volunteer, by programme</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" className="text-sm" value={volFrom} onChange={e => setVolFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" className="text-sm" value={volTo} onChange={e => setVolTo(e.target.value)} />
              </div>
            </div>
            <Button
              size="sm"
              className="bg-[#3191c2] hover:bg-[#2a7fa8] w-full"
              onClick={() => runReport('volunteer-hours')}
              disabled={loading === 'volunteer-hours'}
            >
              {loading === 'volunteer-hours' ? 'Generating…' : 'Generate'}
            </Button>
            {loading === 'volunteer-hours' && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}
            {volunteerData && loading !== 'volunteer-hours' && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{volunteerData.totalVolunteers ?? (volunteerData.data?.length ?? 0)} volunteers</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(volunteerData.data ?? []).slice(0, 10).map((v: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                      <span className="font-medium">{v.name}</span>
                      <span className="text-slate-500">{typeof v.totalHours === 'number' ? v.totalHours.toFixed(1) : v.totalHours}h · {v.sessions} sessions</span>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => exportCSV(volunteerData.data ?? [], 'volunteer-hours.csv')}
                >
                  <Download className="w-3.5 h-3.5 mr-2" />Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Status Report */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              Compliance Status Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Compliance scores across all CCIs</p>
            <Button
              size="sm"
              className="bg-[#3191c2] hover:bg-[#2a7fa8] w-full"
              onClick={() => runReport('compliance')}
              disabled={loading === 'compliance'}
            >
              {loading === 'compliance' ? 'Generating…' : 'Generate'}
            </Button>
            {loading === 'compliance' && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            )}
            {complianceData && loading !== 'compliance' && (
              <div className="space-y-2 text-sm">
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(complianceData.data ?? complianceData ?? []).map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0">
                      <span className="font-medium">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${c.score >= 80 ? 'text-green-600' : c.score >= 50 ? 'text-amber-500' : 'text-red-600'}`}>
                          {c.score}%
                        </span>
                        {c.overdue > 0 && <span className="text-red-500 text-xs">{c.overdue} overdue</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => exportCSV(complianceData.data ?? complianceData ?? [], 'compliance-status.csv')}
                >
                  <Download className="w-3.5 h-3.5 mr-2" />Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
