'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Plus, AlertTriangle } from 'lucide-react';

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [growthForm, setGrowthForm] = useState({ date: new Date().toISOString().split('T')[0], heightCm: '', weightKg: '', notes: '' });
  const [vaccineForm, setVaccineForm] = useState({ vaccineName: '', recommendedDate: '', givenDate: '', facility: '' });
  const [progressForm, setProgressForm] = useState({ sessionType: '', academicEngagement: '', literacyNumeracy: '', socioEmotional: '', lifeSkills: '', narrative: '' });
  const [caseForm, setCaseForm] = useState({ eventType: '', description: '', isSensitive: false, severity: '' });

  async function load() {
    try {
      const { data } = await api.get(`/children/${id}`);
      setChild(data);
    } catch { toast({ title: 'Error loading child', variant: 'destructive' }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  const canEdit = ['SUPER_ADMIN', 'PROGRAM_MANAGER', 'CCI_MANAGER', 'CCI_STAFF'].includes(user?.role || '');

  async function addGrowth() {
    try {
      await api.post(`/children/${id}/health/growth`, growthForm);
      toast({ title: 'Growth record added' });
      load();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  async function addVaccine() {
    try {
      await api.post(`/children/${id}/health/vaccination`, vaccineForm);
      toast({ title: 'Vaccination recorded' });
      load();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  async function addProgress() {
    try {
      await api.post(`/children/${id}/progress`, progressForm);
      toast({ title: 'Progress note added' });
      load();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  async function addCase() {
    try {
      await api.post(`/children/${id}/cases`, caseForm);
      toast({ title: 'Case event recorded' });
      load();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  if (loading) return <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3191c2]" /></div>;
  if (!child) return <div className="p-6">Child not found</div>;

  function getAge(dob: string) { return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)); }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Child protection data — handled under POCSO Act 2012. Access logged.
      </div>

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Admitted', value: new Date(child.admissionDate).toLocaleDateString('en-IN') },
          { label: 'Source', value: child.admissionSource?.replace('_', ' ') },
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

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="cases">Case History</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            {canEdit && (
              <>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Growth Record</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add Growth Record</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1"><Label>Date</Label><Input type="date" value={growthForm.date} onChange={e => setGrowthForm(f => ({ ...f, date: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Height (cm)</Label><Input type="number" value={growthForm.heightCm} onChange={e => setGrowthForm(f => ({ ...f, heightCm: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Weight (kg)</Label><Input type="number" step="0.1" value={growthForm.weightKg} onChange={e => setGrowthForm(f => ({ ...f, weightKg: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Notes</Label><Textarea value={growthForm.notes} onChange={e => setGrowthForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
                      <Button onClick={addGrowth} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Vaccination</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Record Vaccination</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1"><Label>Vaccine Name</Label><Input value={vaccineForm.vaccineName} onChange={e => setVaccineForm(f => ({ ...f, vaccineName: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Recommended Date</Label><Input type="date" value={vaccineForm.recommendedDate} onChange={e => setVaccineForm(f => ({ ...f, recommendedDate: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Given Date (if administered)</Label><Input type="date" value={vaccineForm.givenDate} onChange={e => setVaccineForm(f => ({ ...f, givenDate: e.target.value }))} /></div>
                      <div className="space-y-1"><Label>Facility</Label><Input value={vaccineForm.facility} onChange={e => setVaccineForm(f => ({ ...f, facility: e.target.value }))} /></div>
                      <Button onClick={addVaccine} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          {child.healthGrowth?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Growth Records</h3>
              <div className="space-y-2">
                {child.healthGrowth.map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between p-3 bg-white border rounded-lg text-sm">
                    <span className="text-slate-500">{new Date(g.date).toLocaleDateString('en-IN')}</span>
                    <div className="flex gap-4">
                      {g.heightCm && <span>{g.heightCm} cm</span>}
                      {g.weightKg && <span>{g.weightKg} kg</span>}
                      {g.bmi && <span className="text-slate-400">BMI {g.bmi}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {child.vaccinations?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-2">Vaccinations</h3>
              <div className="space-y-2">
                {child.vaccinations.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-white border rounded-lg text-sm">
                    <span className="font-medium">{v.vaccineName}</span>
                    <div className="flex gap-3 text-slate-500">
                      <span>Due: {new Date(v.recommendedDate).toLocaleDateString('en-IN')}</span>
                      {v.givenDate ? <Badge className="bg-green-100 text-green-700 text-xs">Done</Badge> : <Badge className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 mt-4">
          {canEdit && (
            <Dialog>
              <DialogTrigger asChild><Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]"><Plus className="w-4 h-4 mr-1" />Add Progress Note</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Progress Note</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>Session Type</Label>
                    <Select onValueChange={v => setProgressForm(f => ({ ...f, sessionType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['Education', 'SEL', 'Digital Literacy', 'Health', 'Library', 'Other'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {['academicEngagement', 'literacyNumeracy', 'socioEmotional', 'lifeSkills'].map(field => (
                    <div key={field} className="space-y-1">
                      <Label className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()} (1-5)</Label>
                      <Select onValueChange={v => setProgressForm(f => ({ ...f, [field]: v }))}>
                        <SelectTrigger><SelectValue placeholder="Rate 1-5" /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} {n === 1 ? '(Needs support)' : n === 5 ? '(Excellent)' : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div className="space-y-1"><Label>Narrative (optional)</Label><Textarea value={progressForm.narrative} onChange={e => setProgressForm(f => ({ ...f, narrative: e.target.value }))} rows={3} /></div>
                  <Button onClick={addProgress} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Save Note</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {child.progressNotes?.length > 0 ? (
            <div className="space-y-3">
              {child.progressNotes.map((note: any) => (
                <Card key={note.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-sm font-medium">{note.sessionType}</p>
                      <span className="text-xs text-slate-400">{new Date(note.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {note.academicEngagement && <div className="flex justify-between"><span className="text-slate-500">Academic:</span><span className="font-medium">{note.academicEngagement}/5</span></div>}
                      {note.literacyNumeracy && <div className="flex justify-between"><span className="text-slate-500">Literacy:</span><span className="font-medium">{note.literacyNumeracy}/5</span></div>}
                      {note.socioEmotional && <div className="flex justify-between"><span className="text-slate-500">Social-Emotional:</span><span className="font-medium">{note.socioEmotional}/5</span></div>}
                      {note.lifeSkills && <div className="flex justify-between"><span className="text-slate-500">Life Skills:</span><span className="font-medium">{note.lifeSkills}/5</span></div>}
                    </div>
                    {note.narrative && <p className="text-sm text-slate-600 mt-2 line-clamp-3">{note.narrative}</p>}
                    {note.flagForFollowup && <Badge className="mt-2 bg-amber-100 text-amber-700 text-xs">Flagged for follow-up</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">No progress notes yet.</p>}
        </TabsContent>

        <TabsContent value="cases" className="space-y-4 mt-4">
          {canEdit && (
            <Dialog>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add Case Event</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Case Event</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <Label>Event Type</Label>
                    <Select onValueChange={v => setCaseForm(f => ({ ...f, eventType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['CWC_ORDER', 'FAMILY_TRACING', 'TRANSFER', 'RESTORATION', 'INCIDENT_REPORT', 'COUNSELLING_REFERRAL', 'EXIT'].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {caseForm.eventType === 'INCIDENT_REPORT' && (
                    <div className="space-y-1">
                      <Label>Severity</Label>
                      <Select onValueChange={v => setCaseForm(f => ({ ...f, severity: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1"><Label>Description</Label><Textarea value={caseForm.description} onChange={e => setCaseForm(f => ({ ...f, description: e.target.value }))} rows={4} /></div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="sensitive" checked={caseForm.isSensitive} onChange={e => setCaseForm(f => ({ ...f, isSensitive: e.target.checked }))} />
                    <Label htmlFor="sensitive" className="text-sm">Mark as Sensitive (restrict to PM/Admin)</Label>
                  </div>
                  <Button onClick={addCase} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]">Record</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {child.caseEvents?.length > 0 ? (
            <div className="space-y-2 relative border-l-2 border-slate-200 ml-3 pl-4">
              {child.caseEvents.map((ev: any) => (
                <div key={ev.id} className="relative">
                  <div className="absolute -left-6 top-2 w-3 h-3 rounded-full bg-[#3191c2] border-2 border-white" />
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium">{ev.eventType?.replace(/_/g, ' ')}</p>
                        <span className="text-xs text-slate-400">{new Date(ev.date).toLocaleDateString('en-IN')}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{ev.description}</p>
                      {ev.isSensitive && <Badge className="mt-1 bg-red-100 text-red-700 text-xs">Sensitive</Badge>}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-500 text-sm">No case events recorded.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
