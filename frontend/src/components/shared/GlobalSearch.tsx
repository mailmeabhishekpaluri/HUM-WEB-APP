'use client';
import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Building2, Heart, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface SearchResults {
  ccis: { id: string; name: string; district: string }[];
  children: { id: string; childId: string; firstName: string; lastName?: string; cci: { name: string } }[];
  volunteers: { id: string; userId: string; city: string; user: { name: string; email: string } }[];
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults(null);
      setOpen(false);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`);
        setResults(data);
        setSearched(true);
        setOpen(true);
      } catch {
        setResults(null);
        setSearched(true);
      }
    }, 300);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    search(val);
    if (val.length >= 2) setOpen(true);
  }

  function navigate(path: string) {
    router.push(path);
    setQuery('');
    setResults(null);
    setOpen(false);
    setSearched(false);
  }

  const hasResults = results && (
    results.ccis.length + results.children.length + results.volunteers.length > 0
  );

  function handleBlur() {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
      }
    }, 150);
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          className="pl-9 w-64 bg-slate-50"
          placeholder="Search CCIs, children…"
          value={query}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
        />
      </div>
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
          {hasResults ? (
            <>
              {results!.ccis.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 border-b">CCIs</p>
                  {results!.ccis.map(c => (
                    <button
                      key={c.id}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => navigate(`/ccis/${c.id}`)}
                    >
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.district}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results!.children.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 border-b">Children</p>
                  {results!.children.map(c => (
                    <button
                      key={c.id}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => navigate(`/children/${c.id}`)}
                    >
                      <Heart className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-slate-400">{c.childId} · {c.cci?.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results!.volunteers.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 border-b">Volunteers</p>
                  {results!.volunteers.map(v => (
                    <button
                      key={v.id}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => navigate(`/volunteers/${v.userId}`)}
                    >
                      <Users className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{v.user.name}</p>
                        <p className="text-xs text-slate-400">{v.city}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : searched ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-400">No results for &quot;{query}&quot;</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
