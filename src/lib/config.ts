/** 환경변수 및 설정 */

// Slack
export const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? '';
export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? '';
export const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID ?? '';

// 네이버 검색 API
export const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? '';
export const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? '';

// API 인증
export const API_KEY = process.env.API_KEY ?? '';
export const CRON_SECRET = process.env.CRON_SECRET ?? '';

// 크롤링 설정
export const REQUEST_TIMEOUT = 10_000; // 10초 (Vercel Hobby 제한 고려)
export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// 필터링
export const DAYS_LOOKBACK = 7;
export const URGENT_DAYS = 7;

// 뉴스 소스 (마감일 없는 정보성 콘텐츠)
export const NEWS_SOURCES = new Set(['네이버뉴스', '중소벤처기업부']);

// 검색 키워드
export const SEARCH_KEYWORDS = [
  '창업 지원사업',
  '스타트업 정책',
  '정부 창업 지원',
];
