/**
 * 기존 sent_history.json → DB 이관 스크립트
 *
 * 사용법: npx tsx scripts/seed.ts
 *
 * 환경변수 필요: POSTGRES_URL
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { sql } from '@vercel/postgres';

const HISTORY_FILE = join(__dirname, '..', 'data', 'sent_history.json');

async function main() {
  console.log('=== Seed: sent_history.json → DB 이관 시작 ===');

  // 1. 테이블 생성
  await sql`
    CREATE TABLE IF NOT EXISTS sent_history (
      url TEXT PRIMARY KEY,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log('sent_history 테이블 준비 완료');

  // 2. JSON 파일 읽기
  if (!existsSync(HISTORY_FILE)) {
    console.log('sent_history.json 파일이 없습니다. 건너뜁니다.');
    return;
  }

  const raw = readFileSync(HISTORY_FILE, 'utf-8');
  const urls: string[] = JSON.parse(raw);
  console.log(`${urls.length}건의 URL을 이관합니다.`);

  // 3. DB에 삽입
  let inserted = 0;
  for (const url of urls) {
    const result = await sql`
      INSERT INTO sent_history (url) VALUES (${url})
      ON CONFLICT (url) DO NOTHING
    `;
    if ((result.rowCount ?? 0) > 0) inserted++;
  }

  console.log(`이관 완료: ${inserted}건 신규 삽입, ${urls.length - inserted}건 중복 건너뜀`);
  console.log('=== Seed 완료 ===');
}

main().catch(console.error);
