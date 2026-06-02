'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Phone, Mail, Users, Plus, FileText, CheckCircle, AlertCircle, XCircle, Download, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

const complianceTypeLabel: Record<string, string> = {
  JJ_ACT_RENEWAL: 'JJ Act Renewal',
  STATE_INSPECTION: 'State Inspection',
  CWC_CASE_REVIEW: 'CWC Case Review',
  FIRE_SAFETY: 'Fire Safety Certificate',
  HEALTH_AUDIT: 'Health/Medical Audit',
  STAFF_POLICE_VERIFICATION: 'Staff Police Verification',
  FINANCIAL_AUDIT: 'Financial Audit',
  CWC_VISIT: 'CWC Visit',
};

const complianceStatusBadge: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  COMPLIANT: { label: 'Compliant', className: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
  DUE_SOON: { label: 'Due Soon', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertCircle className="w-3 h-3" /> },
  OVERDUE: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
};

const severityBadge: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600 border-slate-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
};

const docCategoryOptions = [
  'REGISTRATION', 'INSPECTION_REPORT', 'FIRE_SAFETY', 'HEALTH_AUDIT',
  'FINANCIAL_AUDIT', 'POLICE_VERIFICATION', 'PHOTOGRAPH', 'OTHER',
];

function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CCIDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [cci, setCCI] = useState<any>(null);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [loadingCCI, setLoadingCCI] = useState(true);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Dialog open states
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false);
  const [visitDialogOpen, setVisitDialogOpen] = useState(false);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);

  // Forms
  const [complianceForm, setComplianceForm] = useState({ type: '', dueDate: '', notes: '' });
  const [visitForm, setVisitForm] = useState({
    visitDate: '', visitType: '', volunteersPresent: '',
    childrenEngaged: '', observations: '', actionItems: '',
  });
  const [issueForm, setIssueForm] = useState({ title: '', description: '', severity: 'LOW', assignedTo: '' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docForm, setDocForm] = useState({ category: '', name: '' });

  const [submitting, setSubmitting] = useState(false);

  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'PROGRAM_MANAGER';
  const canLog = canEdit || user?.role === 'CCI_MANAGER';

  async function loadCCI() {
    try {
      const res = await api.get(`/ccis/${id}`);
      setCCI(res.data);
    } catch {
      toast.error('Failed to load CCI');
    } finally {
      setLoadingCCI(false);
    }
  }

  async function loadCompliance() {
    setLoadingCompliance(true);
    try {
      const res = await api.get(`/ccis/${id}/compliance`);
      setCompliance(res.data);
    } catch {
      toast.error('Failed to load compliance items');
    } finally {
      setLoadingCompliance(false);
    }
  }

  async function loadVisits() {
    setLoadingVisits(true);
    try {
      const res = await api.get(`/ccis/${id}/visits`);
      setVisits(res.data);
    } catch {
      toast.error('Failed to load visits');
    } finally {
      setLoadingVisits(false);
    }
  }

  async function loadIssues() {
    setLoadingIssues(true);
    try {
      const res = await api.get(`/ccis/${id}/issues`);
      setIssues(res.data);
    } catch {
      toast.error('Failed to load issues');
    } finally {
      setLoadingIssues(false);
    }
  }

  async function loadDocuments() {
    setLoadingDocs(true);
    try {
      const res = await api.get(`/ccis/${id}/documents`);
      setDocuments(res.data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  }

  useEffect(() => {
    loadCCI();
    loadCompliance();
    loadVisits();
    loadIssues();
    loadDocuments();
  }, [id]);

  async function handleAddCompliance() {
    if (!complianceForm.type || !complianceForm.dueDate) {
      toast.error('Type and due date are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/ccis/${id}/compliance`, complianceForm);
      toast.success('Compliance item added');
      setComplianceForm({ type: '', dueDate: '', notes: '' });
      setComplianceDialogOpen(false);
      loadCompliance();
      loadCCI();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add compliance item');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkComplete(itemId: string) {
    try {
      await api.patch(`/ccis/compliance/${itemId}/complete`, { outcome: 'Marked complete' });
      toast.success('Marked as compliant');
      loadCompliance();
      loadCCI();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  }

  async function handleLogVisit() {
    if (!visitForm.visitDate || !visitForm.visitType) {
      toast.error('Visit date and type are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/ccis/${id}/visits`, {
        visitDate: visitForm.visitDate,
        visitType: visitForm.visitType,
        childrenEngaged: visitForm.childrenEngaged ? Number(visitForm.childrenEngaged) : undefined,
        observations: visitForm.observations || undefined,
        activitiesConducted: visitForm.volunteersPresent
          ? visitForm.volunteersPresent.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        actionItems: visitForm.actionItems
          ? visitForm.actionItems.split('\n').filter(Boolean).map(d => ({ description: d.trim() }))
          : [],
      });
      toast.success('Visit logged');
      setVisitForm({ visitDate: '', visitType: '', volunteersPresent: '', childrenEngaged: '', observations: '', actionItems: '' });
      setVisitDialogOpen(false);
      loadVisits();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to log visit');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateIssue() {
    if (!issueForm.title) {
      toast.error('Title is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/ccis/${id}/issues`, {
        title: issueForm.title,
        description: issueForm.description,
        severity: issueForm.severity,
        assigneeId: issueForm.assignedTo || undefined,
      });
      toast.success('Issue logged');
      setIssueForm({ title: '', description: '', severity: 'LOW', assignedTo: '' });
      setIssueDialogOpen(false);
      loadIssues();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to log issue');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadDoc() {
    if (!docFile || !docForm.category) {
      toast.error('File and category are required');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('file', docFile);
      form.append('category', docForm.category);
      form.append('name', docForm.name || docFile.name);
      await api.post(`/ccis/${id}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document uploaded');
      setDocFile(null);
      setDocForm({ category: '', name: '' });
      setDocDialogOpen(false);
      loadDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCCI) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!cci) return <div className="p-6 text-slate-500">CCI not found</div>;

  const totalCapacity = cci.sanctionedCapacityBoys + cci.sanctionedCapacityGirls;
  const scoreColor = cci.complianceScore >= 80 ? 'text-green-600' : cci.complianceScore >= 50 ? 'text-amber-500' : 'text-red-600';
  const openIssues = issues.filter((i: any) => !i.isResolved).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/ccis" className="text-slate-400 hover:text-slate-600 text-sm">← CCIs</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{cci.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{cci.type.replace(/_/g, ' ')}</Badge>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              cci.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
              cci.status === 'ON_WATCH' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
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
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{cci.district}, {cci.state}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 shrink-0" />
              <span>{cci.superintendentPhone}</span>
            </div>
            {cci.superintendentEmail && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{cci.superintendentEmail}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500 mb-1">Occupancy</p>
            <div className="text-2xl font-bold">
              {cci.currentOccupancy}{' '}
              <span className="text-sm font-normal text-slate-500">/ {totalCapacity}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div
                className="bg-[#3191c2] h-2 rounded-full"
                style={{ width: `${Math.min(100, (cci.currentOccupancy / Math.max(1, totalCapacity)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Boys: {cci.sanctionedCapacityBoys} | Girls: {cci.sanctionedCapacityGirls}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-slate-500">Superintendent</p>
            <p className="font-medium text-sm">{cci.superintendentName}</p>
            <p className="text-xs text-slate-400">{cci.managingSociety}</p>
            <p className="text-xs text-slate-400">{cci.fundingType?.replace('_', ' ')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="visits">Visits ({visits.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="issues">
            Issues {openIssues > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{openIssues}</span>}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">CCI Details</h3>
                {cci.registrationNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Registration No.</span>
                    <span className="font-medium">{cci.registrationNumber}</span>
                  </div>
                )}
                {cci.dateOfEstablishment && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Established</span>
                    <span className="font-medium">{new Date(cci.dateOfEstablishment).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Funding Type</span>
                  <span className="font-medium">{cci.fundingType?.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Capacity</span>
                  <span className="font-medium">{totalCapacity}</span>
                </div>
                {cci._count && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Active Children</span>
                    <span className="font-medium">{cci._count.children}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">Compliance Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Score</span>
                  <span className={`font-bold ${scoreColor}`}>{cci.complianceScore}%</span>
                </div>
                {compliance.length > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total items</span>
                      <span className="font-medium">{compliance.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Overdue</span>
                      <span className="font-medium text-red-600">{compliance.filter((c: any) => c.status === 'OVERDUE').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Due soon</span>
                      <span className="font-medium text-amber-600">{compliance.filter((c: any) => c.status === 'DUE_SOON').length}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          {cci.notes && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Notes</h3>
                <p className="text-sm text-slate-600">{cci.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{compliance.length} item{compliance.length !== 1 ? 's' : ''}</p>
            {canEdit && (
              <Dialog open={complianceDialogOpen} onOpenChange={setComplianceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]">
                    <Plus className="w-4 h-4 mr-1.5" />Add Compliance Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={complianceForm.type} onValueChange={v => setComplianceForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(complianceTypeLabel).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={complianceForm.dueDate}
                        onChange={e => setComplianceForm(f => ({ ...f, dueDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes <span className="text-slate-400">(optional)</span></Label>
                      <Textarea
                        rows={2}
                        value={complianceForm.notes}
                        onChange={e => setComplianceForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Any additional context…"
                      />
                    </div>
                    <Button
                      onClick={handleAddCompliance}
                      disabled={submitting}
                      className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]"
                    >
                      {submitting ? 'Adding…' : 'Add Item'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {loadingCompliance ? (
            <TableSkeleton rows={4} cols={5} />
          ) : compliance.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No compliance items tracked yet.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compliance.map((item: any) => {
                    const badge = complianceStatusBadge[item.status] || complianceStatusBadge.COMPLIANT;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-sm">
                          {complianceTypeLabel[item.type] || item.type}
                          {item.notes && <p className="text-xs text-slate-400 font-normal mt-0.5">{item.notes}</p>}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {new Date(item.dueDate).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                            {badge.icon}{badge.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {item.completedAt
                            ? new Date(item.completedAt).toLocaleDateString('en-IN')
                            : new Date(item.updatedAt || item.createdAt).toLocaleDateString('en-IN')}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            {item.status !== 'COMPLIANT' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 text-xs h-7"
                                onClick={() => handleMarkComplete(item.id)}
                              >
                                Mark Complete
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{visits.length} visit{visits.length !== 1 ? 's' : ''} logged</p>
            {canLog && (
              <Dialog open={visitDialogOpen} onOpenChange={setVisitDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]">
                    <Plus className="w-4 h-4 mr-1.5" />Log New Visit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Log CCI Visit</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Visit Date</Label>
                        <Input
                          type="date"
                          value={visitForm.visitDate}
                          onChange={e => setVisitForm(f => ({ ...f, visitDate: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Visit Type</Label>
                        <Select value={visitForm.visitType} onValueChange={v => setVisitForm(f => ({ ...f, visitType: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {['ROUTINE', 'COMPLIANCE_CHECK', 'PROGRAMME_DELIVERY', 'EMERGENCY', 'FIRST_VISIT'].map(v => (
                              <SelectItem key={v} value={v}>{v.replace(/_/g, ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Volunteers Present <span className="text-slate-400">(comma separated)</span></Label>
                      <Input
                        placeholder="Alice, Bob, Charlie"
                        value={visitForm.volunteersPresent}
                        onChange={e => setVisitForm(f => ({ ...f, volunteersPresent: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Children Engaged</Label>
                      <Input
                        type="number"
                        min="0"
                        value={visitForm.childrenEngaged}
                        onChange={e => setVisitForm(f => ({ ...f, childrenEngaged: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Observations</Label>
                      <Textarea
                        rows={3}
                        value={visitForm.observations}
                        onChange={e => setVisitForm(f => ({ ...f, observations: e.target.value }))}
                        placeholder="What was observed during the visit…"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Action Items <span className="text-slate-400">(one per line)</span></Label>
                      <Textarea
                        rows={3}
                        value={visitForm.actionItems}
                        onChange={e => setVisitForm(f => ({ ...f, actionItems: e.target.value }))}
                        placeholder="Follow up on meals provision&#10;Arrange medical check-up"
                      />
                    </div>
                    <Button
                      onClick={handleLogVisit}
                      disabled={submitting}
                      className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]"
                    >
                      {submitting ? 'Saving…' : 'Save Visit Log'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {loadingVisits ? (
            <TableSkeleton rows={4} cols={4} />
          ) : visits.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No visits logged yet.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Logged By</TableHead>
                    <TableHead>Children Engaged</TableHead>
                    <TableHead>Observations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm font-medium text-slate-700 whitespace-nowrap">
                        {new Date(v.visitDate).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs bg-[#3191c2]/10 text-[#3191c2] px-2 py-0.5 rounded-full font-medium">
                          {v.visitType?.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{v.loggedBy?.name || '—'}</TableCell>
                      <TableCell className="text-sm text-center">
                        {v.childrenEngaged != null ? (
                          <span className="flex items-center gap-1 text-slate-700">
                            <Users className="w-3.5 h-3.5" />{v.childrenEngaged}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                        {v.observations || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
            <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#3191c2] hover:bg-[#2a7fa8]">
                  <Upload className="w-4 h-4 mr-1.5" />Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={docForm.category} onValueChange={v => setDocForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {docCategoryOptions.map(c => (
                          <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Display Name <span className="text-slate-400">(optional)</span></Label>
                    <Input
                      placeholder="Leave blank to use filename"
                      value={docForm.name}
                      onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>File</Label>
                    <Input
                      type="file"
                      onChange={e => setDocFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                  </div>
                  <Button
                    onClick={handleUploadDoc}
                    disabled={submitting}
                    className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]"
                  >
                    {submitting ? 'Uploading…' : 'Upload'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingDocs ? (
            <TableSkeleton rows={3} cols={4} />
          ) : documents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Download</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium text-sm">{doc.name}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {doc.category?.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}${doc.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#3191c2] hover:underline"
                        >
                          <Download className="w-3.5 h-3.5" />Download
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {openIssues} open · {issues.length - openIssues} resolved
            </p>
            <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1.5" />Add Issue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log Issue</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={issueForm.title}
                      onChange={e => setIssueForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Brief summary of the issue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={issueForm.description}
                      onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Detailed description…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={issueForm.severity} onValueChange={v => setIssueForm(f => ({ ...f, severity: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned To <span className="text-slate-400">(optional — user ID or name)</span></Label>
                    <Input
                      value={issueForm.assignedTo}
                      onChange={e => setIssueForm(f => ({ ...f, assignedTo: e.target.value }))}
                      placeholder="Assignee ID or leave blank"
                    />
                  </div>
                  <Button
                    onClick={handleCreateIssue}
                    disabled={submitting}
                    className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]"
                  >
                    {submitting ? 'Submitting…' : 'Submit Issue'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingIssues ? (
            <TableSkeleton rows={4} cols={4} />
          ) : issues.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No issues logged.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue: any) => (
                    <TableRow key={issue.id} className={issue.isResolved ? 'opacity-60' : ''}>
                      <TableCell>
                        <p className="text-sm font-medium">{issue.title}</p>
                        {issue.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{issue.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${severityBadge[issue.severity] || severityBadge.LOW}`}>
                          {issue.severity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          issue.isResolved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {issue.isResolved ? 'Resolved' : 'Open'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(issue.createdAt).toLocaleDateString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
