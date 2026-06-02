'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { Plus, AlertTriangle, ShieldAlert } from 'lucide-react';

const POCSO_BANNER = (
  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
    Child protection data — handled under POCSO Act 2012. Access logged.
  </div>
);

function getAge(dob: string) {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN');
}

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Attendance
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    sessionType: '',
    status: '',
    notes: '',
  });
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);

  // Health
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [growthForm, setGrowthForm] = useState({ date: new Date().toISOString().split('T')[0], heightCm: '', weightKg: '', notes: '' });
  const [growthDialogOpen, setGrowthDialogOpen] = useState(false);
  const [illnessForm, setIllnessForm] = useState({ date: new Date().toISOString().split('T')[0], symptoms: '', diagnosis: '', outcome: '' });
  const [illnessDialogOpen, setIllnessDialogOpen] = useState(false);
  const [vaccineForm, setVaccineForm] = useState({ vaccineName: '', recommendedDate: '', givenDate: '', facility: '' });
  const [vaccineDialogOpen, setVaccineDialogOpen] = useState(false);

  // Progress
  const [progress, setProgress] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressForm, setProgressForm] = useState({
    sessionType: '',
    academicEngagement: '',
    literacyNumeracy: '',
    socioEmotional: '',
    lifeSkills: '',
    vocational: '',
    narrative: '',
    flagForFollowup: false,
  });
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);

  // Cases
  const [cases, setCases] = useState<any[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [caseForm, setCaseForm] = useState({ eventType: '', description: '', isSensitive: false, severity: '' });
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);

  async function loadChild() {
    try {
      const { data } = await api.get(`/children/${id}`);
      setChild(data);
    } catch {
      toast.error('Error loading child');
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance() {
    setAttendanceLoading(true);
    try {
      const { data } = await api.get(`/children/${id}/attendance?limit=30`);
      setAttendance(Array.isArray(data) ? data : data.data || []);
    } catch {
      toast.error('Error loading attendance');
    } finally {
      setAttendanceLoading(false);
    }
  }

  async function loadHealth() {
    setHealthLoading(true);
    try {
      const { data } = await api.get(`/children/${id}/health`);
      setHealth(data);
    } catch {
      toast.error('Error loading health records');
    } finally {
      setHealthLoading(false);
    }
  }

  async function loadProgress() {
    setProgressLoading(true);
    try {
      const { data } = await api.get(`/children/${id}/progress`);
      setProgress(Array.isArray(data) ? data : data.data || []);
    } catch {
      toast.error('Error loading progress notes');
    } finally {
      setProgressLoading(false);
    }
  }

  async function loadCases() {
    setCasesLoading(true);
    try {
      const { data } = await api.get(`/children/${id}/cases`);
      setCases(Array.isArray(data) ? data : data.data || []);
    } catch {
      toast.error('Error loading case history');
    } finally {
      setCasesLoading(false);
    }
  }

  useEffect(() => { loadChild(); }, [id]);

  const canEdit = ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'].includes(user?.role || '');

  async function submitAttendance() {
    try {
      await api.post(`/children/${id}/attendance`, attendanceForm);
      toast.success('Attendance marked');
      setAttendanceDialogOpen(false);
      setAttendanceForm({ date: new Date().toISOString().split('T')[0], sessionType: '', status: '', notes: '' });
      loadAttendance();
    } catch {
      toast.error('Error marking attendance');
    }
  }

  async function submitGrowth() {
    try {
      await api.post(`/children/${id}/health`, { ...growthForm, type: 'GROWTH' });
      toast.success('Growth record added');
      setGrowthDialogOpen(false);
      setGrowthForm({ date: new Date().toISOString().split('T')[0], heightCm: '', weightKg: '', notes: '' });
      loadHealth();
    } catch {
      toast.error('Error adding growth record');
    }
  }

  async function submitIllness() {
    try {
      await api.post(`/children/${id}/health`, { ...illnessForm, type: 'ILLNESS' });
      toast.success('Illness log added');
      setIllnessDialogOpen(false);
      setIllnessForm({ date: new Date().toISOString().split('T')[0], symptoms: '', diagnosis: '', outcome: '' });
      loadHealth();
    } catch {
      toast.error('Error adding illness record');
    }
  }

  async function submitVaccine() {
    try {
      await api.post(`/children/${id}/health`, { ...vaccineForm, type: 'VACCINATION' });
      toast.success('Vaccination recorded');
      setVaccineDialogOpen(false);
      setVaccineForm({ vaccineName: '', recommendedDate: '', givenDate: '', facility: '' });
      loadHealth();
    } catch {
      toast.error('Error recording vaccination');
    }
  }

  async function submitProgress() {
    try {
      await api.post(`/children/${id}/progress`, progressForm);
      toast.success('Progress note added');
      setProgressDialogOpen(false);
      setProgressForm({ sessionType: '', academicEngagement: '', literacyNumeracy: '', socioEmotional: '', lifeSkills: '', vocational: '', narrative: '', flagForFollowup: false });
      loadProgress();
    } catch {
      toast.error('Error adding progress note');
    }
  }

  async function submitCase() {
    try {
      await api.post(`/children/${id}/cases`, caseForm);
      toast.success('Case event recorded');
      setCaseDialogOpen(false);
      setCaseForm({ eventType: '', description: '', isSensitive: false, severity: '' });
      loadCases();
    } catch {
      toast.error('Error recording case event');
    }
  }

  const severityColor: Record<string, string> = {
    LOW: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
  };

  const statusColor: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-700',
    ABSENT: 'bg-red-100 text-red-700',
    LEAVE: 'bg-blue-100 text-blue-700',
    SICK: 'bg-amber-100 text-amber-700',
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!child) return <div className="p-6 text-slate-500">Child not found.</div>;

  return (
    <div className="p-6 space-y-6">
      {POCSO_BANNER}

      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/children" className="text-slate-400 text-sm hover:text-slate-600">← Children</Link>
          <h1 className="text-2xl font-bold mt-1">{child.firstName} {child.lastName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{child.childId}</Badge>
            <span className="text-sm text-slate-500">{getAge(child.dateOfBirth)} years · {child.gender}</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{child.cci?.name}</p>
        </div>
        {child.aadhaarMasked && (
          <div className="text-right text-sm">
            <p className="text-slate-400 text-xs">Aadhaar</p>
            <p className="font-mono font-medium">{child.aadhaarMasked}</p>
          </div>
        )}
      </div>

      <Tabs defaultValue="profile" onValueChange={(tab) => {
        if (tab === 'attendance' && attendance.length === 0) loadAttendance();
        if (tab === 'health' && !health) loadHealth();
        if (tab === 'progress' && progress.length === 0) loadProgress();
        if (tab === 'cases' && cases.length === 0) loadCases();
      }}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="cases">Case History</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          {POCSO_BANNER}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Admitted', value: fmtDate(child.admissionDate) },
              { label: 'Source', value: child.admissionSource?.replace(/_/g, ' ') },
              { label: 'Education', value: child.educationalLevel || '—' },
              { label: 'Mother Tongue', value: child.motherTongue || '—' },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="pt-3 pb-3">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="text-sm font-medium mt-0.5">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {child.specialNeeds && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Special Needs</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-600">{child.specialNeeds}</CardContent>
            </Card>
          )}
          {child.background && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Background</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-600">{child.background}</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          {POCSO_BANNER}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-700">Last 30 sessions</h3>
            {canEdit && (
              <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]">
                    <Plus className="w-4 h-4 mr-1" /> Mark Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label>Date</Label>
                      <Input type="date" value={attendanceForm.date} onChange={e => setAttendanceForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Session Type</Label>
                      <Select onValueChange={v => setAttendanceForm(f => ({ ...f, sessionType: v as string }))}>
                        <SelectTrigger><SelectValue placeholder="Select session type" /></SelectTrigger>
                        <SelectContent>
                          {['Education', 'SEL', 'Digital Literacy', 'Health', 'Library', 'Vocational', 'Sports', 'Other'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <Select onValueChange={v => setAttendanceForm(f => ({ ...f, status: v as string }))}>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT">Present</SelectItem>
                          <SelectItem value="ABSENT">Absent</SelectItem>
                          <SelectItem value="LEAVE">Leave</SelectItem>
                          <SelectItem value="SICK">Sick</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Notes (optional)</Label>
                      <Textarea rows={2} value={attendanceForm.notes} onChange={e => setAttendanceForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                    <Button onClick={submitAttendance} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {attendanceLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : attendance.length === 0 ? (
            <p className="text-slate-500 text-sm">No attendance records yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Session Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{fmtDate(a.date)}</TableCell>
                      <TableCell className="text-sm">{a.sessionType}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusColor[a.status] || 'bg-slate-100 text-slate-600'}`}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-xs truncate">{a.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* HEALTH TAB */}
        <TabsContent value="health" className="space-y-6 mt-4">
          {POCSO_BANNER}

          {/* Growth Metrics */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-700">Growth Metrics</h3>
              {canEdit && (
                <Dialog open={growthDialogOpen} onOpenChange={setGrowthDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add Measurement</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Growth Measurement</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1"><Label>Date</Label><Input type="date" value={growthForm.date} onChange={e => setGrowthForm(f => ({ ...f, date: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Height (cm)</Label><Input type="number" value={growthForm.heightCm} onChange={e => setGrowthForm(f => ({ ...f, heightCm: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={growthForm.weightKg} onChange={e => setGrowthForm(f => ({ ...f, weightKg: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={growthForm.notes} onChange={e => setGrowthForm(f => ({ ...f, notes: e.target.value }))} /></div>
                      <Button onClick={submitGrowth} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {healthLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (health?.growth?.length > 0 || child.healthGrowth?.length > 0) ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Height (cm)</TableHead>
                      <TableHead>Weight (kg)</TableHead>
                      <TableHead>BMI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(health?.growth || child.healthGrowth || []).map((g: any) => (
                      <TableRow key={g.id}>
                        <TableCell className="text-sm">{fmtDate(g.date)}</TableCell>
                        <TableCell className="text-sm">{g.heightCm || '—'}</TableCell>
                        <TableCell className="text-sm">{g.weightKg || '—'}</TableCell>
                        <TableCell className="text-sm">{g.bmi || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <p className="text-slate-500 text-sm">No growth records yet.</p>}
          </div>

          {/* Illness Log */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-700">Illness Log</h3>
              {canEdit && (
                <Dialog open={illnessDialogOpen} onOpenChange={setIllnessDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add Illness</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Log Illness</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1"><Label>Date</Label><Input type="date" value={illnessForm.date} onChange={e => setIllnessForm(f => ({ ...f, date: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Symptoms</Label><Textarea rows={2} value={illnessForm.symptoms} onChange={e => setIllnessForm(f => ({ ...f, symptoms: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Diagnosis</Label><Input value={illnessForm.diagnosis} onChange={e => setIllnessForm(f => ({ ...f, diagnosis: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Outcome</Label><Input value={illnessForm.outcome} onChange={e => setIllnessForm(f => ({ ...f, outcome: e.target.value }))} /></div>
                      <Button onClick={submitIllness} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {healthLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (health?.illnesses?.length > 0) ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Symptoms</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {health.illnesses.map((ill: any) => (
                      <TableRow key={ill.id}>
                        <TableCell className="text-sm">{fmtDate(ill.date)}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{ill.symptoms || '—'}</TableCell>
                        <TableCell className="text-sm">{ill.diagnosis || '—'}</TableCell>
                        <TableCell className="text-sm">{ill.outcome || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <p className="text-slate-500 text-sm">No illness records.</p>}
          </div>

          {/* Vaccination Tracker */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-700">Vaccinations</h3>
              {canEdit && (
                <Dialog open={vaccineDialogOpen} onOpenChange={setVaccineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add Vaccine</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Record Vaccination</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1"><Label>Vaccine Name</Label><Input value={vaccineForm.vaccineName} onChange={e => setVaccineForm(f => ({ ...f, vaccineName: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Due Date</Label><Input type="date" value={vaccineForm.recommendedDate} onChange={e => setVaccineForm(f => ({ ...f, recommendedDate: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Given Date (if administered)</Label><Input type="date" value={vaccineForm.givenDate} onChange={e => setVaccineForm(f => ({ ...f, givenDate: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Facility</Label><Input value={vaccineForm.facility} onChange={e => setVaccineForm(f => ({ ...f, facility: e.target.value }))} /></div>
                      <Button onClick={submitVaccine} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {healthLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (health?.vaccinations?.length > 0 || child.vaccinations?.length > 0) ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaccine</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Given Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(health?.vaccinations || child.vaccinations || []).map((v: any) => (
                      <TableRow key={v.id}>
                        <TableCell className="text-sm font-medium">{v.vaccineName}</TableCell>
                        <TableCell className="text-sm">{v.recommendedDate ? fmtDate(v.recommendedDate) : '—'}</TableCell>
                        <TableCell className="text-sm">{v.givenDate ? fmtDate(v.givenDate) : '—'}</TableCell>
                        <TableCell>
                          {v.givenDate
                            ? <Badge className="bg-green-100 text-green-700 text-xs">Done</Badge>
                            : <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <p className="text-slate-500 text-sm">No vaccination records.</p>}
          </div>
        </TabsContent>

        {/* PROGRESS TAB */}
        <TabsContent value="progress" className="space-y-4 mt-4">
          {POCSO_BANNER}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-700">Progress Notes</h3>
            {canEdit && (
              <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]">
                    <Plus className="w-4 h-4 mr-1" /> Add Progress Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Add Progress Note</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label>Session Type</Label>
                      <Input
                        placeholder="e.g. Education, SEL, Digital Literacy"
                        value={progressForm.sessionType}
                        onChange={e => setProgressForm(f => ({ ...f, sessionType: e.target.value }))}
                      />
                    </div>
                    {([
                      ['academicEngagement', 'Academic Engagement'],
                      ['literacyNumeracy', 'Literacy & Numeracy'],
                      ['socioEmotional', 'Socio-Emotional Development'],
                      ['lifeSkills', 'Life Skills'],
                      ['vocational', 'Vocational'],
                    ] as [string, string][]).map(([field, label]) => (
                      <div key={field} className="space-y-1">
                        <Label>{label} (1–5)</Label>
                        <Select onValueChange={v => setProgressForm(f => ({ ...f, [field]: v as string }))}>
                          <SelectTrigger><SelectValue placeholder="Rate 1–5" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 — Needs support</SelectItem>
                            <SelectItem value="2">2 — Developing</SelectItem>
                            <SelectItem value="3">3 — On track</SelectItem>
                            <SelectItem value="4">4 — Good</SelectItem>
                            <SelectItem value="5">5 — Excellent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <div className="space-y-1">
                      <Label className="flex justify-between">
                        <span>Narrative</span>
                        <span className="text-xs text-slate-400">{progressForm.narrative.trim().split(/\s+/).filter(Boolean).length} words</span>
                      </Label>
                      <Textarea
                        rows={4}
                        value={progressForm.narrative}
                        onChange={e => setProgressForm(f => ({ ...f, narrative: e.target.value }))}
                        placeholder="Describe the session and child's engagement..."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="flagFollowup"
                        checked={progressForm.flagForFollowup}
                        onChange={e => setProgressForm(f => ({ ...f, flagForFollowup: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="flagFollowup" className="text-sm cursor-pointer">Flag for follow-up</Label>
                    </div>
                    <Button onClick={submitProgress} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Save Note</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {progressLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
          ) : progress.length === 0 ? (
            <p className="text-slate-500 text-sm">No progress notes yet.</p>
          ) : (
            <div className="space-y-3">
              {progress.map((note: any) => (
                <Card key={note.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-medium">{note.sessionType}</p>
                        {note.author && <p className="text-xs text-slate-400">{note.author.name || note.author}</p>}
                      </div>
                      <span className="text-xs text-slate-400">{fmtDate(note.createdAt || note.date)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-2">
                      {[
                        ['Academic Engagement', note.academicEngagement],
                        ['Literacy & Numeracy', note.literacyNumeracy],
                        ['Socio-Emotional', note.socioEmotional],
                        ['Life Skills', note.lifeSkills],
                        ['Vocational', note.vocational],
                      ].filter(([, v]) => v).map(([label, val]) => (
                        <div key={label as string} className="flex justify-between bg-slate-50 rounded px-2 py-1">
                          <span className="text-slate-500 truncate mr-1">{label as string}:</span>
                          <span className="font-semibold">{val as string}/5</span>
                        </div>
                      ))}
                    </div>
                    {note.narrative && <p className="text-sm text-slate-600 mt-2">{note.narrative}</p>}
                    {note.flagForFollowup && (
                      <Badge className="mt-2 bg-amber-100 text-amber-700 text-xs">Flagged for follow-up</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CASE HISTORY TAB */}
        <TabsContent value="cases" className="space-y-4 mt-4">
          {POCSO_BANNER}
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-slate-700">Case History</h3>
            {canEdit && (
              <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" /> Add Case Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Case Event</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <Label>Event Type</Label>
                      <Select onValueChange={v => setCaseForm(f => ({ ...f, eventType: v as string, severity: '' }))}>
                        <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                        <SelectContent>
                          {[
                            'CWC_ORDER',
                            'INCIDENT_REPORT',
                            'COUNSELLING_REFERRAL',
                            'FAMILY_TRACING',
                            'TRANSFER',
                            'RESTORATION',
                            'EXIT',
                            'OTHER',
                          ].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {caseForm.eventType === 'INCIDENT_REPORT' && (
                      <div className="space-y-1">
                        <Label>Severity</Label>
                        <Select onValueChange={v => setCaseForm(f => ({ ...f, severity: v as string }))}>
                          <SelectTrigger><SelectValue placeholder="Select severity" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea rows={4} value={caseForm.description} onChange={e => setCaseForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sensitive"
                        checked={caseForm.isSensitive}
                        onChange={e => setCaseForm(f => ({ ...f, isSensitive: e.target.checked }))}
                        className="rounded"
                      />
                      <Label htmlFor="sensitive" className="text-sm cursor-pointer">Mark as Sensitive (restrict to PM/Admin)</Label>
                    </div>
                    <Button onClick={submitCase} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Record Event</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {casesLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : cases.length === 0 ? (
            <p className="text-slate-500 text-sm">No case events recorded.</p>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-2">
              {cases.map((ev: any) => (
                <div key={ev.id} className="relative">
                  <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-[#3191c2] border-2 border-white" />
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-medium">
                            {ev.eventType?.replace(/_/g, ' ')}
                          </Badge>
                          {ev.severity && (
                            <Badge className={`text-xs ${severityColor[ev.severity] || 'bg-slate-100 text-slate-600'}`}>
                              {ev.severity}
                            </Badge>
                          )}
                          {ev.isSensitive && <Badge className="bg-red-100 text-red-700 text-xs">Sensitive</Badge>}
                        </div>
                        <span className="text-xs text-slate-400">{fmtDate(ev.date || ev.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-600">{ev.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
