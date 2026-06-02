'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function NewChildPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ccis, setCCIs] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: '',
    cciId: '', admissionDate: '', admissionSource: '', category: '',
    motherTongue: '', educationalLevel: '', emergencyContact: '', cwcCaseNumber: '',
  });

  useEffect(() => { api.get('/ccis').then(r => setCCIs(r.data)); }, []);

  const setF = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const setI = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/children', form);
      toast({ title: `Child registered: ${data.childId}` });
      router.push(`/children/${data.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed', variant: 'destructive' });
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/children"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Add Child Profile</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        This data is protected under POCSO Act 2012. Ensure you have proper authorisation.
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={setI('firstName')} required />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={setI('lastName')} />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth *</Label>
              <Input type="date" value={form.dateOfBirth} onChange={setI('dateOfBirth')} required />
            </div>
            <div className="space-y-2">
              <Label>Gender *</Label>
              <Select onValueChange={setF('gender')} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mother Tongue</Label>
              <Input value={form.motherTongue} onChange={setI('motherTongue')} />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact</Label>
              <Input value={form.emergencyContact} onChange={setI('emergencyContact')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Admission Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CCI *</Label>
              <Select onValueChange={setF('cciId')} required>
                <SelectTrigger><SelectValue placeholder="Select CCI" /></SelectTrigger>
                <SelectContent>
                  {ccis.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Admission Date *</Label>
              <Input type="date" value={form.admissionDate} onChange={setI('admissionDate')} required />
            </div>
            <div className="space-y-2">
              <Label>Admission Source *</Label>
              <Select onValueChange={setF('admissionSource')} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['POLICE', 'CWC', 'SELF', 'NGO_REFERRAL', 'OTHER'].map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select onValueChange={setF('category')} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['ORPHAN', 'SEMI_ORPHAN', 'ABANDONED', 'RESCUED_TRAFFICKING', 'RESCUED_ABUSE', 'DESTITUTE', 'OTHER'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Educational Level</Label>
              <Select onValueChange={setF('educationalLevel')}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['Pre-Primary', 'Class 1-4', 'Class 5-7', 'Class 8', 'Class 9', 'Class 10', 'Class 11-12', 'Dropout', 'Not in School'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CWC Case Number</Label>
              <Input value={form.cwcCaseNumber} onChange={setI('cwcCaseNumber')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={loading}>
            {loading ? 'Saving…' : 'Register Child'}
          </Button>
          <Link href="/children"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
