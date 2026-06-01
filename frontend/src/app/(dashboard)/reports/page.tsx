'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Download, FileText, Users, Building2 } from 'lucide-react';

type ReportType = 'beneficiary' | 'volunteer-hours' | 'compliance' | 'attendance';

function downloadCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [beneficiaryData, setBeneficiaryData] = useState<any>(null);
  const [volunteerData, setVolunteerData] = useState<any>(null);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);

  async function runReport(type: ReportType) {
    setLoading(type);
    try {
      if (type === 'beneficiary') {
        const params = new URLSearchParams();
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        const { data } = await api.get(`/children/reports/beneficiary${params.toString() ? '?' + params.toString() : ''}`);
        setBeneficiaryData(data);
      } else if (type === 'volunteer-hours') {
        const params = new URLSearchParams();
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        const { data } = await api.get(`/reports/volunteer-hours${params.toString() ? '?' + params.toString() : ''}`);
        setVolunteerData(data);
      } else if (type === 'compliance') {
        const { data } = await api.get('/reports/compliance-summary');
        setComplianceData(data);
      } else if (type === 'attendance') {
        const params = new URLSearchParams();
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        const { data } = await api.get(`/reports/attendance-summary${params.toString() ? '?' + params.toString() : ''}`);
        setAttendanceData(data);
      }
      toast({ title: 'Report generated' });
    } catch { toast({ title: 'Error generating report', variant: 'destructive' }); }
    finally { setLoading(null); }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and export data reports</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-1">
              <Label className="text-xs">From Date</Label>
              <Input type="date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To Date</Label>
              <Input type="date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Beneficiary Report */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-rose-500" />Beneficiary Register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Sex-disaggregated beneficiary counts per CCI</p>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 w-full" onClick={() => runReport('beneficiary')} disabled={loading === 'beneficiary'}>
              {loading === 'beneficiary' ? 'Generating…' : 'Generate'}
            </Button>
            {beneficiaryData && (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded p-2"><p className="font-bold text-lg">{beneficiaryData.totalChildren}</p><p className="text-xs text-slate-500">Total</p></div>
                  <div className="bg-blue-50 rounded p-2"><p className="font-bold text-lg">{beneficiaryData.byGender?.male}</p><p className="text-xs text-slate-500">Male</p></div>
                  <div className="bg-pink-50 rounded p-2"><p className="font-bold text-lg">{beneficiaryData.byGender?.female}</p><p className="text-xs text-slate-500">Female</p></div>
                </div>
                {beneficiaryData.byCCI?.length > 0 && (
                  <div className="space-y-1">
                    {beneficiaryData.byCCI.map((c: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                        <span className="font-medium">{c.cciName}</span>
                        <span className="text-slate-500">{c.total} ({c.male}M / {c.female}F)</span>
                      </div>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" className="w-full" onClick={() => downloadCSV(beneficiaryData.byCCI, 'beneficiary-report.csv')}>
                  <Download className="w-3.5 h-3.5 mr-2" />Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Volunteer Hours Report */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" />Volunteer Hours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Hours logged per volunteer, by programme</p>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 w-full" onClick={() => runReport('volunteer-hours')} disabled={loading === 'volunteer-hours'}>
              {loading === 'volunteer-hours' ? 'Generating…' : 'Generate'}
            </Button>
            {volunteerData && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{volunteerData.totalVolunteers} volunteers</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {volunteerData.data?.slice(0, 10).map((v: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                      <span className="font-medium">{v.name}</span>
                      <span className="text-slate-500">{v.totalHours.toFixed(1)}h · {v.sessions} sessions</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => downloadCSV(volunteerData.data, 'volunteer-hours.csv')}>
                  <Download className="w-3.5 h-3.5 mr-2" />Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" />Compliance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Compliance scores across all CCIs</p>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 w-full" onClick={() => runReport('compliance')} disabled={loading === 'compliance'}>
              {loading === 'compliance' ? 'Generating…' : 'Generate'}
            </Button>
            {complianceData && (
              <div className="space-y-2 text-sm">
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {complianceData.data?.map((c: any) => (
                    <div key={c.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0">
                      <span className="font-medium">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${c.score >= 80 ? 'text-green-600' : c.score >= 50 ? 'text-amber-500' : 'text-red-600'}`}>{c.score}%</span>
                        {c.overdue > 0 && <span className="text-red-500 text-xs">{c.overdue} overdue</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => downloadCSV(complianceData.data, 'compliance-summary.csv')}>
                  <Download className="w-3.5 h-3.5 mr-2" />Export CSV
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-green-500" />Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">Attendance rates per child with date range filter</p>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 w-full" onClick={() => runReport('attendance')} disabled={loading === 'attendance'}>
              {loading === 'attendance' ? 'Generating…' : 'Generate'}
            </Button>
            {attendanceData && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{attendanceData.totalChildren} children</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {attendanceData.data?.slice(0, 10).map((c: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className={`font-medium ${c.attendanceRate >= 95 ? 'text-green-600' : c.attendanceRate >= 75 ? 'text-amber-500' : 'text-red-600'}`}>{c.attendanceRate}%</span>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => downloadCSV(attendanceData.data, 'attendance-summary.csv')}>
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
