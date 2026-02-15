/** 수집된 기사/공고 데이터 */
export interface Article {
  id?: number;
  title: string;
  url: string;
  source: string;
  date: string; // YYYY-MM-DD
  category: string;
  deadline: string; // YYYY-MM-DD or ''
  notified: boolean;
  notifiedAt: Date | null;
  createdAt: Date | null;
}

/** 크롤 로그 */
export interface CrawlLog {
  id?: number;
  runId: string;
  source: string;
  status: 'success' | 'error' | 'timeout';
  articlesFound: number;
  articlesNew: number;
  errorMessage: string;
  durationMs: number;
  startedAt: Date;
}

/** 카테고리 상수 */
export const CAT_URGENT = '🔥 마감 임박';
export const CAT_NEW = '📋 신규 공고';
export const CAT_NEWS = '📰 정책 동향';

/** 카테고리별 메인 메시지 표시 제한 */
export const CATEGORY_LIMITS: Record<string, number | null> = {
  [CAT_URGENT]: null,
  [CAT_NEW]: 10,
  [CAT_NEWS]: 5,
};

/** 카테고리 표시 순서 */
export const CATEGORY_ORDER = [CAT_URGENT, CAT_NEW, CAT_NEWS];
