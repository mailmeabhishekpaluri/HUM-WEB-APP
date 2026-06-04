'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Target, CheckCircle2 } from 'lucide-react';
import { CURRICULUM_TYPE_LABELS } from '@/lib/labels';

interface CurriculumItem {
  id: string;
  type: string;
  sequence: number;
  title: string;
  objective: string | null;
  activities: string[];
  outcome: string | null;
  durationMinutes: number;
}

function CurriculumList({ type }: { type: 'SEL' | 'DIGITAL_LITERACY' }) {
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/programs/curriculum?type=${type}`)
      .then(r => { if (active) setItems(r.data); })
      .catch(() => toast.error('Failed to load curriculum'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type]);

  if (loading) {
    return <div className="space-y-3 mt-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>;
  }
  const label = type === 'SEL' ? 'Session' : 'Module';

  return (
    <div className="space-y-3 mt-4">
      {items.map(item => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#3191c2] text-white text-sm font-semibold">{item.sequence}</span>
                {label} {item.sequence}: {item.title}
              </CardTitle>
              <Badge variant="outline" className="text-xs">{item.durationMinutes} min</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {item.objective && (
              <p className="flex items-start gap-2 text-slate-600"><Target className="w-4 h-4 mt-0.5 text-[#3191c2] shrink-0" />{item.objective}</p>
            )}
            {item.activities?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.activities.map((a, i) => <Badge key={i} variant="secondary" className="text-xs font-normal">{a}</Badge>)}
              </div>
            )}
            {item.outcome && (
              <p className="flex items-start gap-2 text-slate-500"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />{item.outcome}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CurriculumPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#3191c2]" />Curriculum
        </h1>
        <p className="text-slate-500 text-sm mt-1">Session-by-session content for the on-ground programmes.</p>
      </div>
      <Tabs defaultValue="SEL">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="SEL">{CURRICULUM_TYPE_LABELS.SEL} (12)</TabsTrigger>
          <TabsTrigger value="DIGITAL_LITERACY">{CURRICULUM_TYPE_LABELS.DIGITAL_LITERACY} (4)</TabsTrigger>
        </TabsList>
        <TabsContent value="SEL"><CurriculumList type="SEL" /></TabsContent>
        <TabsContent value="DIGITAL_LITERACY"><CurriculumList type="DIGITAL_LITERACY" /></TabsContent>
      </Tabs>
    </div>
  );
}
