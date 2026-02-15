/** 수집된 기사 처리: 중복 제거, 날짜 필터링, 카테고리 분류 */

import { DAYS_LOOKBACK, NEWS_SOURCES, URGENT_DAYS } from '@/lib/config';
import { insertArticle, getSentUrls, addSentHistory } from '@/lib/db/queries';
import { calcDDay, parseDate } from '@/lib/utils';
import { CAT_URGENT, CAT_NEW, CAT_NEWS } from '@/types';
import type { Article } from '@/types';
import type { RawArticle } from './crawlers/types';

/** 기사를 카테고리로 분류 */
function classify(article: RawArticle): string {
  if (NEWS_SOURCES.has(article.source)) return CAT_NEWS;

  const dDay = calcDDay(article.deadline);
  if (dDay !== null && dDay >= 0 && dDay <= URGENT_DAYS) return CAT_URGENT;

  return CAT_NEW;
}

/** 기사 목록을 처리하여 카테고리별로 분류된 딕셔너리 반환 */
export async function processArticles(
  rawArticles: RawArticle[]
): Promise<{ categorized: Record<string, Article[]>; newCount: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_LOOKBACK);
  cutoff.setHours(0, 0, 0, 0);

  const sentUrls = await getSentUrls();
  const result: Record<string, Article[]> = {};
  const newUrls: string[] = [];

  for (const raw of rawArticles) {
    // 날짜 필터링 (뉴스만)
    if (NEWS_SOURCES.has(raw.source)) {
      const dt = parseDate(raw.date);
      if (dt && dt < cutoff) continue;
    }

    // 마감된 공고 제외
    const dDay = calcDDay(raw.deadline);
    if (dDay !== null && dDay < 0) continue;

    // 중복 제거 (DB 기반)
    if (sentUrls.has(raw.url)) continue;

    // 카테고리 분류
    const category = classify(raw);
    const article: Article = {
      title: raw.title,
      url: raw.url,
      source: raw.source,
      date: raw.date,
      deadline: raw.deadline,
      category,
      notified: false,
      notifiedAt: null,
      createdAt: null,
    };

    if (!result[category]) result[category] = [];
    result[category].push(article);
    newUrls.push(raw.url);

    // DB에 기사 저장
    await insertArticle({ ...article });
  }

  // 정렬
  if (result[CAT_URGENT]) {
    result[CAT_URGENT].sort((a, b) => {
      const da = calcDDay(a.deadline) ?? 999;
      const db = calcDDay(b.deadline) ?? 999;
      return da - db;
    });
  }
  if (result[CAT_NEW]) {
    result[CAT_NEW].sort((a, b) => b.date.localeCompare(a.date));
  }
  if (result[CAT_NEWS]) {
    result[CAT_NEWS].sort((a, b) => b.date.localeCompare(a.date));
  }

  // 전송 이력 업데이트
  if (newUrls.length > 0) {
    await addSentHistory(newUrls);
  }

  const newCount = newUrls.length;
  const total = rawArticles.length;
  console.log(`[Processor] 처리 완료: ${newCount}건 신규, ${total - newCount}건 필터링됨`);

  return { categorized: result, newCount };
}
