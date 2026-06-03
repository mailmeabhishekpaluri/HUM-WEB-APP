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
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { PROGRAMME_OPTIONS, SAFEGUARDING_LEVEL_OPTIONS } from '@/lib/labels';

interface Skill {
  id: string;
  name: string;
}

export default function NewOpportunityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ccis, setCCIs] = useState<{ id: string; name: string }[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    title: '', programmeArea: '', cciId: '', dateTime: '',
    durationMinutes: '60', location: '', requiredCount: '5',
    description: '', safeguardingLevel: 'NONE_REQUIRED',
  });

  useEffect(() => {
    api.get('/ccis').then(r => setCCIs(r.data)).catch(() => {});
    api.get('/opportunities/skills/list').then(r => setSkills(r.data ?? [])).catch(() => {});
  }, []);

  const setF = (k: string) => (v: string | null) => setForm(f => ({ ...f, [k]: v ?? '' }));
  const setI = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  function toggleSkill(name: string) {
    setSelectedSkills(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/opportunities', {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        requiredCount: Number(form.requiredCount),
        requiredSkillNames: Array.from(selectedSkills),
        cciId: form.cciId || undefined,
      });
      toast.success('Opportunity created and published!');
      router.push('/opportunities');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to create opportunity');
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
              <Select value={form.programmeArea} onValueChange={setF('programmeArea')} required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PROGRAMME_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
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
              <Select value={form.safeguardingLevel} onValueChange={setF('safeguardingLevel')} defaultValue="NONE_REQUIRED">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAFEGUARDING_LEVEL_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Required Skills</Label>
              {skills.length === 0 ? (
                <p className="text-sm text-slate-400">No skills available.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => {
                    const active = selectedSkills.has(s.name);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSkill(s.name)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          active
                            ? 'bg-[#3191c2] text-white border-[#3191c2]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-[#3191c2] hover:text-[#3191c2]'
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={setI('description')} rows={3} /></div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="submit" className="bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={loading}>{loading ? 'Publishing…' : 'Publish Opportunity'}</Button>
          <Link href="/opportunities"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
