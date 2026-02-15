import { sql } from './index';

/** 테이블 생성 (첫 실행 시 또는 마이그레이션 시 호출) */
export async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      source VARCHAR(50) NOT NULL,
      published_date DATE,
      deadline DATE,
      category VARCHAR(30) NOT NULL DEFAULT '',
      notified BOOLEAN NOT NULL DEFAULT FALSE,
      notified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sent_history (
      url TEXT PRIMARY KEY,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS crawl_logs (
      id SERIAL PRIMARY KEY,
      run_id UUID NOT NULL,
      source VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL,
      articles_found INT NOT NULL DEFAULT 0,
      articles_new INT NOT NULL DEFAULT 0,
      error_message TEXT DEFAULT '',
      duration_ms INT NOT NULL DEFAULT 0,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // 인덱스
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_notified ON articles(notified)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crawl_logs_run ON crawl_logs(run_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crawl_logs_started ON crawl_logs(started_at DESC)`;
}
