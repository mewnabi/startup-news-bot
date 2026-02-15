'use client';

import { useState } from 'react';

export default function CrawlButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleCrawl() {
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch('/api/crawl', { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        setResult(`${data.totalCrawled}건 수집, ${data.newArticles}건 신규`);
      } else {
        setResult(`오류: ${data.error ?? '알 수 없는 오류'}`);
      }
    } catch (e) {
      setResult(`요청 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleCrawl}
        disabled={loading}
        className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '크롤링 중...' : '수동 크롤 실행'}
      </button>
      {result && <span className="text-sm text-muted">{result}</span>}
    </div>
  );
}
