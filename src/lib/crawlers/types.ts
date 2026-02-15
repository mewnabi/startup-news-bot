/** 크롤러에서 수집한 원시 기사 데이터 */
export interface RawArticle {
  title: string;
  url: string;
  source: string;
  date: string; // YYYY-MM-DD
  deadline: string; // YYYY-MM-DD or ''
}

/** 크롤러 실행 결과 */
export interface CrawlResult {
  source: string;
  articles: RawArticle[];
  error?: string;
  durationMs: number;
}
