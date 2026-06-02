'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle } from 'lucide-react';

type Step = 'register' | 'quiz' | 'done';

interface QuizQuestion { id: number; question: string; options: string[] }

export default function VolunteerRegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('register');
  const [userId, setUserId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; total: number } | null>(null);
  const [regLoading, setRegLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', city: '', password: '' });
  const setI = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegLoading(true);
    try {
      await api.post('/volunteers/register', form);
      const loginRes = await api.post('/auth/login', { email: form.email, password: form.password });
      localStorage.setItem('accessToken', loginRes.data.accessToken);
      localStorage.setItem('refreshToken', loginRes.data.refreshToken);
      setUserId(loginRes.data.user.id);
      setAccessToken(loginRes.data.accessToken);
      const quizRes = await api.get('/volunteers/quiz');
      setQuizQuestions(quizRes.data);
      setStep('quiz');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.response?.data?.error || 'Error', variant: 'destructive' });
    } finally { setRegLoading(false); }
  }

  async function submitQuiz() {
    if (Object.keys(answers).length < quizQuestions.length) {
      toast({ title: 'Please answer all questions', variant: 'destructive' });
      return;
    }
    setQuizLoading(true);
    try {
      const { data } = await api.post('/volunteers/quiz/submit', { answers });
      setQuizResult(data);
      setStep('done');
    } catch { toast({ title: 'Error submitting quiz', variant: 'destructive' }); }
    finally { setQuizLoading(false); }
  }

  if (step === 'register') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-[#3191c2] rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">H</span></div>
            <span className="font-semibold">HUManity Foundation</span>
          </div>
          <CardTitle>Become a Volunteer</CardTitle>
          <CardDescription>Join our community of changemakers</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={form.name} onChange={setI('name')} required /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={setI('email')} required /></div>
            <div className="space-y-2"><Label>Mobile *</Label><Input value={form.mobile} onChange={setI('mobile')} required /></div>
            <div className="space-y-2"><Label>City *</Label><Input value={form.city} onChange={setI('city')} required /></div>
            <div className="space-y-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={setI('password')} required /></div>
            <Button type="submit" className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={regLoading}>
              {regLoading ? 'Registering…' : 'Register & Continue to Quiz →'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  if (step === 'quiz') return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Child Safeguarding Quiz</CardTitle>
            <CardDescription>This mandatory quiz ensures you understand child protection principles. You need 8/10 to pass.</CardDescription>
          </CardHeader>
        </Card>
        {quizQuestions.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="pt-4">
              <p className="font-medium text-sm mb-3">{idx + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, optIdx) => (
                  <label key={optIdx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === optIdx ? 'bg-[#e8f4f9] border-[#3191c2]' : 'hover:bg-slate-50'}`}>
                    <input type="radio" name={`q-${q.id}`} value={optIdx} checked={answers[q.id] === optIdx} onChange={() => setAnswers(a => ({ ...a, [q.id]: optIdx }))} className="accent-[#3191c2]" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        <Button onClick={submitQuiz} className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]" disabled={quizLoading}>
          {quizLoading ? 'Submitting…' : 'Submit Quiz'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${quizResult?.passed ? 'bg-green-100' : 'bg-amber-100'}`}>
            <CheckCircle className={`w-8 h-8 ${quizResult?.passed ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <h2 className="text-xl font-bold">{quizResult?.passed ? 'Quiz Passed!' : 'Quiz Result'}</h2>
          <p className="text-slate-600">You scored <strong>{quizResult?.score}/{quizResult?.total}</strong></p>
          {quizResult?.passed ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">Your profile is now in the approval queue. A Program Manager will review and activate your account within 5 working days.</p>
              <Button className="w-full bg-[#3191c2] hover:bg-[#2a7fa8]" onClick={() => router.push('/login')}>Go to Login →</Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">You need at least 8/10. Please review child safeguarding principles and try again.</p>
              <Button variant="outline" className="w-full" onClick={() => { setAnswers({}); setStep('quiz'); }}>Retake Quiz</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
