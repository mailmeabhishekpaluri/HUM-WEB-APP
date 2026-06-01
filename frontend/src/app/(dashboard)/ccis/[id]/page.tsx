'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MapPin, Phone, Mail, Users, CheckCircle, AlertCircle, XCircle, Plus, FileText, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const statusIcon: Record<string, React.ReactNode> = {
  COMPLIANT: <CheckCircle className="w-4 h-4 text-green-600" />,
  DUE_SOON: <AlertCircle className="w-4 h-4 text-amber-500" />,
  OVERDUE: <XCircle className="w-4 h-4 text-red-600" />,
};
const statusColor: Record<string, string> = {
  COMPLIANT: 'text-green-600',
  DUE_SOON: 'text-amber-500',
  OVERDUE: 'text-red-600',
};
const complianceTypeLabel: Record<string, string> = {
  JJ_ACT_RENEWAL: 'JJ Act Renewal', STATE_INSPECTION: 'State Inspection',
  CWC_CASE_REVIEW: 'CWC Case Review', FIRE_SAFETY: 'Fire Safety Certificate',
  HEALTH_AUDIT: 'Health/Medical Audit', STAFF_POLICE_VERIFICATION: 'Staff Police Verification',
  FINANCIAL_AUDIT: 'Financial Audit', CWC_VISIT: 'CWC Visit',
};

export default function CCIDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cci, setCCI] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitForm, setVisitForm] = useState({ visitType: '', observations: '', childrenEngaged: '' });
  const [issueForm, setIssueForm] = useState({ title: '', description: '', severity: 'LOW' });
  const [complianceForm, setComplianceForm] = useState({ type: '', dueDate: '' });

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';

  async function loadData() {
    try {
      const [cciRes, visitsRes, issuesRes] = await Promise.all([
        api.get(`/ccis/${id}`),
        api.get(`/ccis/${id}/visits`),
        api.get(`/ccis/${id}/issues`),
      ]);
      setCCI(cciRes.data);
      setVisits(visitsRes.data);
      setIssues(issuesRes.data);
    } catch { toast({ title: 'Failed to load CCI', variant: 'destructive' }); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [id]);

  async function logVisit() {
    try {
      await api.post(`/ccis/${id}/visits`, { ...visitForm, visitDate: new Date().toISOString(), childrenEngaged: Number(visitForm.childrenEngaged) || undefined });
      toast({ title: 'Visit logged' });
      setVisitForm({ visitType: '', observations: '', childrenEngaged: '' });
      loadData();
    } catch (err: any) { toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' }); }
  }

  async function createIssue() {
    try {
      await api.post(`/ccis/${id}/issues`, issueForm);
      toast({ title: 'Issue logged' });
      setIssueForm({ title: '', description: '', severity: 'LOW' });
      loadData();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  async function addCompliance() {
    try {
      await api.post(`/ccis/${id}/compliance`, complianceForm);
      toast({ title: 'Compliance item added' });
      setComplianceForm({ type: '', dueDate: '' });
      loadData();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  }

  if (loading) return <div className="p-6 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>;
  if (!cci) return <div className="p-6 text-slate-500">CCI not found</div>;

  const scoreColor = cci.complianceScore >= 80 ? 'text-green-600' : cci.complianceScore >= 50 ? 'text-amber-500' : 'text-red-600';
  const totalCapacity = cci.sanctionedCapacityBoys + cci.sanctionedCapacityGirls;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/ccis" className="text-slate-400 hover:text-slate-600 text-sm">← CCIs</Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{cci.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{cci.type.replace(/_/g, ' ')}</Badge>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cci.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : cci.status === 'ON_WATCH' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
              {cci.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${scoreColor}`}>{cci.complianceScore}%</div>
          <div className="text-xs text-slate-500">Compliance score</div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="w-4 h-4 shrink-0" /><span>{cci.district}, {cci.state}</span></div>
            <div className="flex items-center gap-2 text-sm text-slate-600"><Phone className="w-4 h-4 shrink-0" /><span>{cci.superintendentPhone}</span></div>
            {cci.superintendentEmail && <div className="flex items-center gap-2 text-sm text-slate-600"><Mail className="w-4 h-4 shrink-0" /><span>{cci.superintendentEmail}</span></div>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Occupancy</p>
            <div className="text-2xl font-bold">{cci.currentOccupancy} <span className="text-sm font-normal text-slate-500">/ {totalCapacity}</span></div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(100, (cci.currentOccupancy / Math.max(1, totalCapacity)) * 100)}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">Boys: {cci.sanctionedCapacityBoys} | Girls: {cci.sanctionedCapacityGirls}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-slate-500">Superintendent</p>
            <p className="font-medium text-sm">{cci.superintendentName}</p>
            <p className="text-xs text-slate-400">{cci.managingSociety}</p>
            <p className="text-xs text-slate-400">{cci.fundingType.replace('_', ' ')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="compliance">
        <TabsList>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="visits">Visit Logs ({visits.length})</TabsTrigger>
          <TabsTrigger value="issues">Issues ({issues.filter(i => !i.isResolved).length})</TabsTrigger>
        </TabsList>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-3 mt-4">
          {canEdit && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" />Add Compliance Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select onValueChange={v => setComplianceForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(complianceTypeLabel).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={complianceForm.dueDate} onChange={e => setComplianceForm(f => ({ ...f, dueDate: e.target.value }))} />
                  </div>
                  <Button onClick={addCompliance} className="w-full bg-orange-500 hover:bg-orange-600">Add</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {cci.complianceItems.length === 0 ? (
            <p className="text-slate-500 text-sm">No compliance items yet. Add them to track deadlines.</p>
          ) : (
            <div className="space-y-2">
              {cci.complianceItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex items-center gap-3">
                    {statusIcon[item.status]}
                    <div>
                      <p className="text-sm font-medium">{complianceTypeLabel[item.type] || item.type}</p>
                      <p className="text-xs text-slate-400">Due: {new Date(item.dueDate).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${statusColor[item.status]}`}>{item.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Visit Logs Tab */}
        <TabsContent value="visits" className="space-y-3 mt-4">
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER' || user?.role === 'CCI_MANAGER') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Log Visit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log CCI Visit</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Visit Type</Label>
                    <Select onValueChange={v => setVisitForm(f => ({ ...f, visitType: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['ROUTINE', 'COMPLIANCE_CHECK', 'PROGRAMME_DELIVERY', 'EMERGENCY', 'FIRST_VISIT'].map(v => <SelectItem key={v} value={v}>{v.replace('_', ' ')}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Children Engaged</Label>
                    <Input type="number" value={visitForm.childrenEngaged} onChange={e => setVisitForm(f => ({ ...f, childrenEngaged: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Observations</Label>
                    <Textarea value={visitForm.observations} onChange={e => setVisitForm(f => ({ ...f, observations: e.target.value }))} rows={3} />
                  </div>
                  <Button onClick={logVisit} className="w-full bg-orange-500 hover:bg-orange-600">Save Visit Log</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {visits.length === 0 ? (
            <p className="text-slate-500 text-sm">No visits logged yet.</p>
          ) : (
            <div className="space-y-2">
              {visits.map((v: any) => (
                <div key={v.id} className="p-3 bg-white border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{v.visitType?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-400">{new Date(v.visitDate).toLocaleDateString('en-IN')} · by {v.loggedBy?.name}</p>
                    </div>
                    {v.childrenEngaged && <span className="text-xs text-slate-500">{v.childrenEngaged} children</span>}
                  </div>
                  {v.observations && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{v.observations}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-3 mt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" />Log Issue</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Issue</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={issueForm.title} onChange={e => setIssueForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={issueForm.description} onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select onValueChange={v => setIssueForm(f => ({ ...f, severity: v }))} defaultValue="LOW">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createIssue} className="w-full bg-orange-500 hover:bg-orange-600">Submit</Button>
              </div>
            </DialogContent>
          </Dialog>
          {issues.length === 0 ? (
            <p className="text-slate-500 text-sm">No open issues.</p>
          ) : (
            <div className="space-y-2">
              {issues.map((issue: any) => (
                <div key={issue.id} className="p-3 bg-white border rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{issue.title}</p>
                    <span className={`text-xs font-medium ${issue.severity === 'CRITICAL' ? 'text-red-600' : issue.severity === 'HIGH' ? 'text-orange-600' : issue.severity === 'MEDIUM' ? 'text-amber-600' : 'text-slate-500'}`}>{issue.severity}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{issue.description}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
