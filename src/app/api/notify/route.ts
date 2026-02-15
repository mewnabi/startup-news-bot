import { NextResponse } from 'next/server';
import { API_KEY } from '@/lib/config';
import { getUnnotifiedArticles } from '@/lib/db/queries';
import { sendSlack } from '@/lib/notifier';
import { CATEGORY_ORDER } from '@/types';

export const dynamic = 'force-dynamic';

/** 수동 Slack 전송: 미전송 기사를 카테고리별로 묶어 전송 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (API_KEY && authHeader !== `Bearer ${API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const articles = await getUnnotifiedArticles();
    if (articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '전송할 미전송 기사가 없습니다.',
      });
    }

    // 카테고리별 그룹화
    const categorized: Record<string, typeof articles> = {};
    for (const article of articles) {
      const cat = article.category || CATEGORY_ORDER[1]; // 기본: 신규 공고
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(article);
    }

    const sent = await sendSlack(categorized);

    return NextResponse.json({
      success: sent,
      articlesNotified: articles.length,
    });
  } catch (e) {
    console.error('[Notify] 실행 오류:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
