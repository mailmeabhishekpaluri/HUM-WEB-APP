'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function NewOpportunityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ccis, setCCIs] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    title: '', programmeArea: '', cciId: '', dateTime: '',
    durationMinutes: '60', location: '', requiredCount: '5',
    description: '', safeguardingLevel: 'NONE_REQUIRED', requiredSkillNames: '',
  });

  useEffect(() => { api.get('/ccis').then(r => setCCIs(r.data)); }, []);

  const setF = (k: string) => (v: string | null) => setForm(f => ({ ...f, [k]: v ?? '' }));
  const setI = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const requiredSkillNames = form.requiredSkillNames.split(',').map(s => s.trim()).filter(Boolean);
      await api.post('/opportunities', {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        requiredCount: Number(form.requiredCount),
        requiredSkillNames,
        cciId: form.cciId || undefined,
      });
      toast({ title: 'Opportunity created and published!' });
      router.push('/opportunities');
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error, variant: 'destructive' });
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/opportunities"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Create Opportunity</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2"><Label>Title *</Label><Input value={form.title} onChange={setI('title')} required /></div>
            <div className="space-y-2">
              <Label>Programme Area *</Label>
              <Select onValueChange={setF('programmeArea')} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['EDUCATION','HEALTH','NUTRITION','LIFE_SKILLS','SPORTS','OTHER'].map(p => <SelectItem key={p} value={p}>{p.replace('_',' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked CCI (optional)</Label>
              <Select onValueChange={setF('cciId')}>
                <SelectTrigger><SelectValue placeholder="Select CCI" /></SelectTrigger>
                <SelectContent>
                  {ccis.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date &amp; Time *</Label><Input type="datetime-local" value={form.dateTime} onChange={setI('dateTime')} required /></div>
            <div className="space-y-2"><Label>Duration (minutes)</Label><Input type="number" value={form.durationMinutes} onChange={setI('durationMinutes')} /></div>
            <div className="space-y-2"><Label>Location *</Label><Input value={form.location} onChange={setI('location')} required /></div>
            <div className="space-y-2"><Label>Volunteers Required</Label><Input type="number" value={form.requiredCount} onChange={setI('requiredCount')} /></div>
            <div className="space-y-2">
              <Label>Safeguarding Level</Label>
              <Select onValueChange={setF('safeguardingLevel')} defaultValue="NONE_REQUIRED">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE_REQUIRED">None required</SelectItem>
                  <SelectItem value="SAFEGUARDING_QUIZ_ONLY">Safeguarding quiz required</SelectItem>
                  <SelectItem value="POLICE_VERIFICATION_REQUIRED">Police verification required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Required Skills (comma-separated)</Label>
              <Input value={form.requiredSkillNames} onChange={setI('requiredSkillNames')} placeholder="Teaching, Medical, Photography" />
            </div>
            <div className="md:col-span-2 space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={setI('description')} rows={3} /></div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={loading}>{loading ? 'Publishing…' : 'Publish Opportunity'}</Button>
          <Link href="/opportunities"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
