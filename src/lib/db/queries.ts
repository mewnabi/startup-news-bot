import { sql } from './index';
import type { Article, CrawlLog } from '@/types';

// ─── Articles ───

/** 기사 삽입 (중복 URL 무시) */
export async function insertArticle(article: Omit<Article, 'id' | 'notified' | 'notifiedAt' | 'createdAt'>) {
  const result = await sql`
    INSERT INTO articles (title, url, source, published_date, deadline, category)
    VALUES (${article.title}, ${article.url}, ${article.source},
            ${article.date || null}, ${article.deadline || null}, ${article.category})
    ON CONFLICT (url) DO NOTHING
    RETURNING id
  `;
  return result.rowCount ?? 0;
}

/** 기사 목록 조회 (필터 + 페이지네이션) */
export async function getArticles(options: {
  category?: string;
  source?: string;
  notified?: boolean;
  page?: number;
  limit?: number;
} = {}) {
  const { category, source, notified, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // 동적 필터 조건 구성
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (category) {
    values.push(category);
    conditions.push(`category = $${values.length}`);
  }
  if (source) {
    values.push(source);
    conditions.push(`source = $${values.length}`);
  }
  if (notified !== undefined) {
    values.push(notified);
    conditions.push(`notified = $${values.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // @vercel/postgres의 sql 태그는 동적 쿼리 구성이 어려우므로 raw query 사용
  const countResult = await sql.query(
    `SELECT COUNT(*)::int as count FROM articles ${where}`,
    values
  );
  const total = countResult.rows[0]?.count ?? 0;

  const dataResult = await sql.query(
    `SELECT * FROM articles ${where} ORDER BY published_date DESC NULLS LAST, created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset]
  );

  return {
    articles: dataResult.rows.map(rowToArticle),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/** 최근 기사 N건 */
export async function getRecentArticles(limit = 10): Promise<Article[]> {
  const result = await sql`
    SELECT * FROM articles
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result.rows.map(rowToArticle);
}

/** 카테고리별 건수 */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const result = await sql`
    SELECT category, COUNT(*)::int as count
    FROM articles
    GROUP BY category
  `;
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.category] = row.count;
  }
  return counts;
}

/** 소스별 건수 */
export async function getSourceList(): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT source FROM articles ORDER BY source
  `;
  return result.rows.map((r) => r.source);
}

/** 미전송 기사 조회 */
export async function getUnnotifiedArticles(): Promise<Article[]> {
  const result = await sql`
    SELECT * FROM articles
    WHERE notified = FALSE
    ORDER BY published_date DESC NULLS LAST
  `;
  return result.rows.map(rowToArticle);
}

/** 기사 전송 완료 처리 */
export async function markNotified(urls: string[]) {
  if (urls.length === 0) return;
  for (const url of urls) {
    await sql`
      UPDATE articles SET notified = TRUE, notified_at = NOW()
      WHERE url = ${url}
    `;
  }
}

// ─── Sent History ───

/** URL이 이미 전송되었는지 확인 */
export async function isUrlSent(url: string): Promise<boolean> {
  const result = await sql`
    SELECT 1 FROM sent_history WHERE url = ${url}
  `;
  return (result.rowCount ?? 0) > 0;
}

/** 전송 이력 추가 */
export async function addSentHistory(urls: string[]) {
  for (const url of urls) {
    await sql`
      INSERT INTO sent_history (url) VALUES (${url})
      ON CONFLICT (url) DO NOTHING
    `;
  }
}

/** 전송 이력에 있는 URL 세트 조회 */
export async function getSentUrls(): Promise<Set<string>> {
  const result = await sql`SELECT url FROM sent_history`;
  return new Set(result.rows.map((r) => r.url));
}

// ─── Crawl Logs ───

/** 크롤 로그 삽입 */
export async function insertCrawlLog(log: Omit<CrawlLog, 'id'>) {
  await sql`
    INSERT INTO crawl_logs (run_id, source, status, articles_found, articles_new, error_message, duration_ms, started_at)
    VALUES (${log.runId}, ${log.source}, ${log.status},
            ${log.articlesFound}, ${log.articlesNew},
            ${log.errorMessage}, ${log.durationMs}, ${log.startedAt.toISOString()})
  `;
}

/** 크롤 로그 조회 (최근 순) */
export async function getCrawlLogs(limit = 50): Promise<CrawlLog[]> {
  const result = await sql`
    SELECT * FROM crawl_logs
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
  return result.rows.map(rowToCrawlLog);
}

/** 최근 크롤 실행 정보 (run_id별 그룹) */
export async function getLatestCrawlRun() {
  const result = await sql`
    SELECT * FROM crawl_logs
    WHERE run_id = (SELECT run_id FROM crawl_logs ORDER BY started_at DESC LIMIT 1)
    ORDER BY source
  `;
  return result.rows.map(rowToCrawlLog);
}

// ─── Row Mappers ───

function rowToArticle(row: Record<string, unknown>): Article {
  return {
    id: row.id as number,
    title: row.title as string,
    url: row.url as string,
    source: row.source as string,
    date: row.published_date ? String(row.published_date).slice(0, 10) : '',
    category: row.category as string,
    deadline: row.deadline ? String(row.deadline).slice(0, 10) : '',
    notified: row.notified as boolean,
    notifiedAt: row.notified_at ? new Date(row.notified_at as string) : null,
    createdAt: row.created_at ? new Date(row.created_at as string) : null,
  };
}

function rowToCrawlLog(row: Record<string, unknown>): CrawlLog {
  return {
    id: row.id as number,
    runId: row.run_id as string,
    source: row.source as string,
    status: row.status as CrawlLog['status'],
    articlesFound: row.articles_found as number,
    articlesNew: row.articles_new as number,
    errorMessage: (row.error_message as string) ?? '',
    durationMs: row.duration_ms as number,
    startedAt: new Date(row.started_at as string),
  };
}
