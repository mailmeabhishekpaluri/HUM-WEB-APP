'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const INDIAN_STATES = ['Andhra Pradesh','Telangana','Karnataka','Tamil Nadu','Maharashtra','Delhi','Rajasthan','Gujarat','Uttar Pradesh','West Bengal','Other'];

export default function NewCCIPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', type: '', registrationNumber: '', district: '', state: '',
    fullAddress: '', sanctionedCapacityBoys: '', sanctionedCapacityGirls: '',
    currentOccupancy: '', superintendentName: '', superintendentPhone: '',
    superintendentEmail: '', managingSociety: '', fundingType: '', notes: '',
  });

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const setInput = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/ccis', {
        ...form,
        sanctionedCapacityBoys: Number(form.sanctionedCapacityBoys),
        sanctionedCapacityGirls: Number(form.sanctionedCapacityGirls),
        currentOccupancy: Number(form.currentOccupancy),
      });
      toast({ title: 'CCI registered successfully' });
      router.push(`/ccis/${data.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Failed to register CCI', variant: 'destructive' });
    } finally { setLoading(false); }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ccis"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register New CCI</h1>
          <p className="text-slate-500 text-sm">Child Care Institution details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>CCI Name *</Label>
              <Input value={form.name} onChange={setInput('name')} placeholder="e.g. Apna Ghar Children's Home" required />
            </div>
            <div className="space-y-2">
              <Label>CCI Type *</Label>
              <Select onValueChange={set('type')} required>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHILDRENS_HOME">Children's Home</SelectItem>
                  <SelectItem value="OBSERVATION_HOME">Observation Home</SelectItem>
                  <SelectItem value="SPECIAL_HOME">Special Home</SelectItem>
                  <SelectItem value="SHELTER_HOME">Shelter Home</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Registration Number (JJ Act) *</Label>
              <Input value={form.registrationNumber} onChange={setInput('registrationNumber')} required />
            </div>
            <div className="space-y-2">
              <Label>District *</Label>
              <Input value={form.district} onChange={setInput('district')} required />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Select onValueChange={set('state')} required>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Full Address *</Label>
              <Textarea value={form.fullAddress} onChange={setInput('fullAddress')} rows={2} required />
            </div>
            <div className="space-y-2">
              <Label>Funding Type *</Label>
              <Select onValueChange={set('fundingType')} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOVT_FUNDED">Government Funded</SelectItem>
                  <SelectItem value="NGO_FUNDED">NGO Funded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Managing Society / Trust *</Label>
              <Input value={form.managingSociety} onChange={setInput('managingSociety')} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Capacity & Occupancy</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Capacity (Boys) *</Label>
              <Input type="number" min={0} value={form.sanctionedCapacityBoys} onChange={setInput('sanctionedCapacityBoys')} required />
            </div>
            <div className="space-y-2">
              <Label>Capacity (Girls) *</Label>
              <Input type="number" min={0} value={form.sanctionedCapacityGirls} onChange={setInput('sanctionedCapacityGirls')} required />
            </div>
            <div className="space-y-2">
              <Label>Current Occupancy *</Label>
              <Input type="number" min={0} value={form.currentOccupancy} onChange={setInput('currentOccupancy')} required />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Superintendent Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Superintendent Name *</Label>
              <Input value={form.superintendentName} onChange={setInput('superintendentName')} required />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={form.superintendentPhone} onChange={setInput('superintendentPhone')} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.superintendentEmail} onChange={setInput('superintendentEmail')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={setInput('notes')} placeholder="Any additional notes…" rows={3} />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={loading}>
            {loading ? 'Registering…' : 'Register CCI'}
          </Button>
          <Link href="/ccis"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
