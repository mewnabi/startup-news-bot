import { NextResponse } from 'next/server';
import { API_KEY } from '@/lib/config';
import { createTables } from '@/lib/db/schema';
import { runAllCrawlers } from '@/lib/crawlers';
import { processArticles } from '@/lib/processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

/** 수동 크롤 트리거 */
export async function POST(request: Request) {
  // API Key 인증
  const authHeader = request.headers.get('authorization');
  if (API_KEY && authHeader !== `Bearer ${API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await createTables();

    const { runId, results, allArticles } = await runAllCrawlers();
    const { categorized, newCount } = await processArticles(allArticles);

    const summary = results.map((r) => ({
      source: r.source,
      found: r.articles.length,
      error: r.error,
      durationMs: r.durationMs,
    }));

    return NextResponse.json({
      success: true,
      runId,
      totalCrawled: allArticles.length,
      newArticles: newCount,
      categories: Object.fromEntries(
        Object.entries(categorized).map(([k, v]) => [k, v.length])
      ),
      crawlers: summary,
    });
  } catch (e) {
    console.error('[Crawl] 실행 오류:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
