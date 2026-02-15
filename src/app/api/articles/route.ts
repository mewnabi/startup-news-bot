import { NextResponse } from 'next/server';
import { getArticles } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

/** 기사 목록 JSON API (필터 + 페이지네이션) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? undefined;
  const source = searchParams.get('source') ?? undefined;
  const notifiedParam = searchParams.get('notified');
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '20')));

  let notified: boolean | undefined;
  if (notifiedParam === 'true') notified = true;
  if (notifiedParam === 'false') notified = false;

  try {
    const result = await getArticles({ category, source, notified, page, limit });
    return NextResponse.json(result);
  } catch (e) {
    console.error('[Articles API] 오류:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    );
  }
}
