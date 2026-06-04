'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Stethoscope, ArrowLeft, Save } from 'lucide-react';
import { HEALTH_EVENT_TYPE_LABELS, formatDateTime } from '@/lib/labels';

interface ChildRow {
  id: string;
  childId: string;
  firstName: string;
  lastName: string | null;
  dateOfBirth: string;
}

interface Checkup {
  opportunity: {
    id: string;
    title: string;
    dateTime: string;
    healthEventType: string | null;
    cci: { id: string; name: string; district: string } | null;
  };
  children: ChildRow[];
}

interface RowState {
  heightCm: string;
  weightKg: string;
  notes: string;
}

const EMPTY: RowState = { heightCm: '', weightKg: '', notes: '' };

function computeBmi(h: string, w: string): string {
  const hn = parseFloat(h);
  const wn = parseFloat(w);
  if (!hn || !wn || hn <= 0) return '—';
  const meters = hn / 100;
  return (wn / (meters * meters)).toFixed(1);
}

export default function CheckupDetailPage() {
  const params = useParams();
  const opportunityId = params.opportunityId as string;

  const [data, setData] = useState<Checkup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/health/checkups/${opportunityId}`);
      setData(res.data);
      const next: Record<string, RowState> = {};
      for (const c of res.data.children ?? []) next[c.id] = { ...EMPTY };
      setRows(next);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load checkup');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (opportunityId) load(); }, [opportunityId]);

  function update(id: string, field: keyof RowState, value: string) {
    setRows(r => ({ ...r, [id]: { ...(r[id] ?? EMPTY), [field]: value } }));
  }

  const dirtyRows = useMemo(() => {
    return Object.entries(rows)
      .filter(([, r]) => r.heightCm.trim() !== '' || r.weightKg.trim() !== '')
      .map(([childId, r]) => ({
        childId,
        heightCm: r.heightCm ? parseFloat(r.heightCm) : undefined,
        weightKg: r.weightKg ? parseFloat(r.weightKg) : undefined,
        notes: r.notes || undefined,
      }));
  }, [rows]);

  async function handleSave() {
    if (!dirtyRows.length) {
      toast.error('Enter at least one height or weight to save');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/health/checkups/${opportunityId}/measurements`, { records: dirtyRows });
      toast.success(`Saved ${res.data?.growthRecords ?? dirtyRows.length} growth record${(res.data?.growthRecords ?? dirtyRows.length) === 1 ? '' : 's'}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save measurements');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) return <div className="p-6 text-slate-500">Checkup not found.</div>;

  const eventLabel = data.opportunity.healthEventType
    ? HEALTH_EVENT_TYPE_LABELS[data.opportunity.healthEventType] ?? data.opportunity.healthEventType
    : 'Health Event';

  return (
    <div className="p-6 space-y-6">
      <div>
        <Link href="/health" className="text-sm text-slate-500 hover:text-[#3191c2] inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />Back to Health &amp; Nutrition
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-2">
          <Stethoscope className="w-6 h-6 text-[#3191c2]" />Record Checkup Measurements
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{data.opportunity.cci?.name ?? 'CCI (TBD)'}</CardTitle>
              <p className="text-xs text-slate-500 mt-1">{data.opportunity.cci?.district ?? '—'} · {formatDateTime(data.opportunity.dateTime)}</p>
            </div>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">{eventLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Enter the height and weight measured today for each child. BMI updates automatically. Add notes for any observations (e.g. underweight, growth concern, referral needed).
        </CardContent>
      </Card>

      <div className="rounded-lg border overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Child</TableHead>
              <TableHead className="w-32">Height (cm)</TableHead>
              <TableHead className="w-32">Weight (kg)</TableHead>
              <TableHead className="w-20 text-right">BMI</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.children.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-slate-400 py-8">No children enrolled at this CCI.</TableCell>
              </TableRow>
            ) : (
              data.children.map(c => {
                const r = rows[c.id] ?? EMPTY;
                const bmi = computeBmi(r.heightCm, r.weightKg);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">
                      <p className="font-medium text-slate-900">{c.firstName}{c.lastName ? ` ${c.lastName}` : ''}</p>
                      <p className="text-xs text-slate-500">{c.childId}</p>
                    </TableCell>
                    <TableCell>
                      <Input type="number" inputMode="decimal" step="0.1" min="0"
                        value={r.heightCm}
                        onChange={e => update(c.id, 'heightCm', e.target.value)}
                        placeholder="150" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" inputMode="decimal" step="0.1" min="0"
                        value={r.weightKg}
                        onChange={e => update(c.id, 'weightKg', e.target.value)}
                        placeholder="40" />
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-medium text-slate-700">{bmi}</TableCell>
                    <TableCell>
                      <Input value={r.notes}
                        onChange={e => update(c.id, 'notes', e.target.value)}
                        placeholder="Observation (optional)" />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || dirtyRows.length === 0} className="bg-[#3191c2] hover:bg-[#2a7fa8]">
          <Save className="w-4 h-4 mr-2" />{saving ? 'Saving…' : `Save All (${dirtyRows.length})`}
        </Button>
      </div>
    </div>
  );
}
