'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRightLeft } from 'lucide-react';
import { GRADE_LABELS, CLASS_SUBJECT_LABELS, formatDateTime, humanize } from '@/lib/labels';

interface OpenRequest {
  id: string;
  reason: string | null;
  status: string;
  createdAt: string;
  classSession: {
    id: string;
    date: string;
    classSection: { grade: string; subject: string };
  };
}

export default function SubstitutionsPage() {
  const [requests, setRequests] = useState<OpenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  async function load() {
    try {
      const { data } = await api.get('/classes/substitution-requests');
      setRequests(data);
    } catch {
      toast.error('Failed to load substitution board');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function accept(id: string) {
    setAcceptingId(id);
    try {
      await api.post(`/classes/substitution-requests/${id}/accept`);
      toast.success("You're now teaching this class");
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Could not accept — it may already be filled');
      load();
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-[#3191c2]" />Open Substitution Board
        </h1>
        <p className="text-slate-500 text-sm mt-1">Accept a class another volunteer can&apos;t take.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : requests.length === 0 ? (
        <p className="text-slate-400 italic">No open substitution requests 🎉</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map(r => (
            <Card key={r.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {GRADE_LABELS[r.classSession.classSection.grade] ?? humanize(r.classSession.classSection.grade)} · {CLASS_SUBJECT_LABELS[r.classSession.classSection.subject] ?? humanize(r.classSession.classSection.subject)}
                    </p>
                    <p className="text-sm text-slate-500">{formatDateTime(r.classSession.date)}</p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-600">Open</Badge>
                </div>
                {r.reason && <p className="text-sm text-slate-600 italic">“{r.reason}”</p>}
                <Button
                  className="bg-[#3191c2] hover:bg-[#2a7fa8] w-full"
                  disabled={acceptingId === r.id}
                  onClick={() => accept(r.id)}
                >
                  {acceptingId === r.id ? 'Accepting…' : 'Accept & Teach'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
