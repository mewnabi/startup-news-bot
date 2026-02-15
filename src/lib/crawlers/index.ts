import { v4 as uuidv4 } from 'uuid';
import { insertCrawlLog } from '@/lib/db/queries';
import { BaseCrawler } from './base';
import { BizinfoCrawler } from './bizinfo';
import { KisedCrawler } from './kised';
import { KStartupCrawler } from './kstartup';
import { MSSCrawler } from './mss';
import { NaverNewsCrawler } from './naver-news';
import type { CrawlResult, RawArticle } from './types';

export { BaseCrawler } from './base';
export type { RawArticle, CrawlResult } from './types';

const CRAWLERS: Array<new () => BaseCrawler> = [
  KStartupCrawler,
  MSSCrawler,
  KisedCrawler,
  BizinfoCrawler,
  NaverNewsCrawler,
];

/** 모든 크롤러를 병렬 실행하고 결과를 반환 */
export async function runAllCrawlers(): Promise<{
  runId: string;
  results: CrawlResult[];
  allArticles: RawArticle[];
}> {
  const runId = uuidv4();
  const startTime = Date.now();

  console.log(`[Runner] 크롤링 시작 (runId: ${runId})`);

  const results = await Promise.allSettled(
    CRAWLERS.map((CrawlerClass) => runSingleCrawler(new CrawlerClass(), runId))
  );

  const crawlResults: CrawlResult[] = [];
  const allArticles: RawArticle[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      crawlResults.push(result.value);
      allArticles.push(...result.value.articles);
    } else {
      console.error('[Runner] 크롤러 실행 실패:', result.reason);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[Runner] 크롤링 완료: ${allArticles.length}건 수집 (${crawlResults.length}/${CRAWLERS.length} 성공, ${elapsed}ms)`
  );

  return { runId, results: crawlResults, allArticles };
}

/** 개별 크롤러 실행 + 로그 기록 */
async function runSingleCrawler(crawler: BaseCrawler, runId: string): Promise<CrawlResult> {
  const startedAt = new Date();
  const start = Date.now();

  try {
    const articles = await crawler.crawl();
    const durationMs = Date.now() - start;

    const log = {
      runId,
      source: crawler.name,
      status: 'success' as const,
      articlesFound: articles.length,
      articlesNew: 0, // 프로세서에서 업데이트
      errorMessage: '',
      durationMs,
      startedAt,
    };
    await insertCrawlLog(log);

    return { source: crawler.name, articles, durationMs };
  } catch (e) {
    const durationMs = Date.now() - start;
    const errorMessage = e instanceof Error ? e.message : String(e);

    const log = {
      runId,
      source: crawler.name,
      status: 'error' as const,
      articlesFound: 0,
      articlesNew: 0,
      errorMessage,
      durationMs,
      startedAt,
    };
    await insertCrawlLog(log);

    return { source: crawler.name, articles: [], error: errorMessage, durationMs };
  }
}
