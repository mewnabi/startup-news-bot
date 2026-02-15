'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CAT_URGENT, CAT_NEW, CAT_NEWS } from '@/types';

const CATEGORIES = ['전체', CAT_URGENT, CAT_NEW, CAT_NEWS];

interface Props {
  sources: string[];
}

export default function CategoryFilter({ sources }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') ?? '';
  const currentSource = searchParams.get('source') ?? '';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== '전체') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/articles?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => {
          const isActive = cat === '전체' ? !currentCategory : currentCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => updateFilter('category', cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'bg-card text-muted border border-border hover:bg-accent/5'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
      {sources.length > 0 && (
        <select
          value={currentSource}
          onChange={(e) => updateFilter('source', e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-border bg-card text-foreground"
        >
          <option value="">전체 출처</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
