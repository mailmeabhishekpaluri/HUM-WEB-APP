'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Users } from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'SICK';

interface Child {
  id: string;
  childId: string;
  firstName: string;
  lastName?: string;
  dateOfBirth: string;
  gender: string;
}

interface CCI {
  id: string;
  name: string;
}

interface RowStatus {
  childId: string;
  status: AttendanceStatus;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'PRESENT', label: 'Present', color: 'text-green-600' },
  { value: 'ABSENT', label: 'Absent', color: 'text-red-500' },
  { value: 'LEAVE', label: 'Leave', color: 'text-blue-500' },
  { value: 'SICK', label: 'Sick', color: 'text-amber-500' },
];

function getAge(dob: string) {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export default function BulkAttendancePage() {
  const [ccis, setCcis] = useState<CCI[]>([]);
  const [cciId, setCciId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [rowStatuses, setRowStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/ccis').then(r => {
      setCcis(Array.isArray(r.data) ? r.data : r.data?.data || []);
    }).catch(() => toast.error('Failed to load CCIs'));
  }, []);

  async function loadChildren() {
    if (!cciId) { toast.error('Please select a CCI first'); return; }
    if (!date) { toast.error('Please select a date'); return; }
    if (!sessionType) { toast.error('Please select a session type'); return; }
    setLoadingChildren(true);
    setLoaded(false);
    try {
      const { data } = await api.get(`/children?cciId=${cciId}`);
      const list: Child[] = Array.isArray(data) ? data : data?.data || [];
      setChildren(list);
      const defaults: Record<string, AttendanceStatus> = {};
      list.forEach(c => { defaults[c.id] = 'PRESENT'; });
      setRowStatuses(defaults);
      setLoaded(true);
    } catch {
      toast.error('Error loading children');
    } finally {
      setLoadingChildren(false);
    }
  }

  async function submitAll() {
    if (children.length === 0) return;
    setSubmitting(true);
    try {
      const records = children.map(c => ({
        childId: c.id,
        date,
        sessionType,
        status: rowStatuses[c.id] || 'PRESENT',
      }));
      await api.post('/children/attendance/bulk', { records });
      toast.success(`Attendance submitted for ${children.length} children`);
      setChildren([]);
      setRowStatuses({});
      setLoaded(false);
    } catch {
      toast.error('Error submitting attendance');
    } finally {
      setSubmitting(false);
    }
  }

  const summary = loaded ? {
    present: Object.values(rowStatuses).filter(s => s === 'PRESENT').length,
    absent: Object.values(rowStatuses).filter(s => s === 'ABSENT').length,
    leave: Object.values(rowStatuses).filter(s => s === 'LEAVE').length,
    sick: Object.values(rowStatuses).filter(s => s === 'SICK').length,
  } : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bulk Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">Mark attendance for all children in a CCI at once</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        Child protection data — handled under POCSO Act 2012. Access logged.
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>CCI</Label>
              <Select onValueChange={v => { setCciId(v as string); setLoaded(false); setChildren([]); }}>
                <SelectTrigger><SelectValue placeholder="Select CCI" /></SelectTrigger>
                <SelectContent>
                  {ccis.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => { setDate(e.target.value); setLoaded(false); setChildren([]); }} />
            </div>
            <div className="space-y-1">
              <Label>Session Type</Label>
              <Select onValueChange={v => { setSessionType(v as string); setLoaded(false); setChildren([]); }}>
                <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                <SelectContent>
                  {['Education', 'SEL', 'Digital Literacy', 'Health', 'Library', 'Vocational', 'Sports', 'Other'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={loadChildren}
            disabled={loadingChildren || !cciId || !date || !sessionType}
            className="bg-[#3191c2] hover:bg-[#2a7fa8]"
          >
            {loadingChildren ? 'Loading…' : 'Load Children'}
          </Button>
        </CardContent>
      </Card>

      {loadingChildren && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      )}

      {loaded && children.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No children enrolled in this CCI</p>
        </div>
      )}

      {loaded && children.length > 0 && (
        <>
          {summary && (
            <div className="flex gap-3 flex-wrap">
              <Badge className="bg-green-100 text-green-700">{summary.present} Present</Badge>
              <Badge className="bg-red-100 text-red-700">{summary.absent} Absent</Badge>
              <Badge className="bg-blue-100 text-blue-700">{summary.leave} Leave</Badge>
              <Badge className="bg-amber-100 text-amber-700">{summary.sick} Sick</Badge>
            </div>
          )}

          <div className="space-y-2">
            {children.map(child => (
              <Card key={child.id} className="overflow-hidden">
                <CardContent className="py-3 px-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0 ${child.gender === 'FEMALE' ? 'bg-pink-400' : child.gender === 'MALE' ? 'bg-blue-400' : 'bg-slate-400'}`}>
                      {child.firstName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{child.firstName} {child.lastName}</p>
                      <p className="text-xs text-slate-400">{child.childId} · {getAge(child.dateOfBirth)} yrs</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setRowStatuses(s => ({ ...s, [child.id]: opt.value }))}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                          rowStatuses[child.id] === opt.value
                            ? opt.value === 'PRESENT' ? 'bg-green-500 text-white border-green-500'
                            : opt.value === 'ABSENT' ? 'bg-red-500 text-white border-red-500'
                            : opt.value === 'LEAVE' ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={submitAll}
              disabled={submitting}
              className="bg-[#3191c2] hover:bg-[#2a7fa8] px-8"
            >
              {submitting ? 'Submitting…' : `Submit All (${children.length})`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
