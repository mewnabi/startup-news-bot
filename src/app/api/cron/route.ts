import { NextResponse } from 'next/server';
import { CRON_SECRET } from '@/lib/config';
import { createTables } from '@/lib/db/schema';
import { runAllCrawlers } from '@/lib/crawlers';
import { processArticles } from '@/lib/processor';
import { sendSlack } from '@/lib/notifier';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Hobby plan 제한

/** Vercel Cron 진입점: 크롤 → 처리 → 알림 */
export async function GET(request: Request) {
  // Cron 인증 (Vercel이 자동으로 CRON_SECRET 헤더 전송)
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // DB 테이블 보장
    await createTables();

    // 1. 크롤링
    const { runId, allArticles } = await runAllCrawlers();

    if (allArticles.length === 0) {
      return NextResponse.json({
        success: true,
        runId,
        message: '수집된 기사가 없습니다.',
      });
    }

    // 2. 처리
    const { categorized, newCount } = await processArticles(allArticles);

    if (newCount === 0) {
      return NextResponse.json({
        success: true,
        runId,
        message: '전송할 새로운 소식이 없습니다.',
        totalCrawled: allArticles.length,
      });
    }

    // 3. Slack 전송
    const sent = await sendSlack(categorized);

    return NextResponse.json({
      success: sent,
      runId,
      totalCrawled: allArticles.length,
      newArticles: newCount,
      slackSent: sent,
    });
  } catch (e) {
    console.error('[Cron] 실행 오류:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
