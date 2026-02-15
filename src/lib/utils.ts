/** 유틸리티 함수 */

/** HTML 태그 및 엔티티 제거 */
export function stripHtml(text: string): string {
  // HTML 엔티티 디코딩
  const decoded = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  // HTML 태그 제거
  return decoded.replace(/<[^>]+>/g, '').trim();
}

/** YYYY-MM-DD 형식 날짜 파싱 */
export function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (isNaN(date.getTime())) return null;
  return date;
}

/** 마감일까지 남은 일수 계산. 음수면 마감됨. */
export function calcDDay(deadline: string): number | null {
  if (!deadline) return null;
  const dl = parseDate(deadline);
  if (!dl) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 날짜 문자열에서 YYYY-MM-DD 추출 */
export function extractDate(text: string): string {
  const match = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!match) return todayStr();
  const [, y, m, d] = match;
  try {
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (isNaN(dt.getTime())) return todayStr();
    return dt.toISOString().slice(0, 10);
  } catch {
    return todayStr();
  }
}

/** RFC 2822 날짜를 YYYY-MM-DD로 변환 (네이버 API용) */
export function parseRfc2822Date(dateStr: string): string {
  try {
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return '';
    return dt.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/** 날짜를 MM.DD 형식으로 표시 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return '';
  return dateStr.slice(5).replace(/-/g, '.');
}
