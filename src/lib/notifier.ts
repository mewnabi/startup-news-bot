/** Slack 메시지 전송: 메인 요약 + 스레드 전체 목록 */

import { WebClient } from '@slack/web-api';
import { SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, SLACK_WEBHOOK_URL } from '@/lib/config';
import { markNotified } from '@/lib/db/queries';
import { calcDDay, formatShortDate } from '@/lib/utils';
import { CAT_URGENT, CATEGORY_LIMITS, CATEGORY_ORDER } from '@/types';
import type { Article } from '@/types';

/** 기사 한 줄 포맷팅 */
function formatArticle(a: Article): string {
  const parts = [`• <${a.url}|${a.title}>`];
  const info = [a.source];

  if (a.category === CAT_URGENT) {
    const dDay = calcDDay(a.deadline);
    if (dDay !== null) {
      info.push(`마감 ${formatShortDate(a.deadline)} (D-${dDay})`);
    }
  } else if (a.deadline) {
    info.push(`마감 ${formatShortDate(a.deadline)}`);
    if (a.date) info.push(`등록 ${formatShortDate(a.date)}`);
  } else if (a.date) {
    info.push(formatShortDate(a.date));
  }

  parts.push(`  └ ${info.join(' | ')}`);
  return parts.join('\n');
}

/** 메인 메시지 구성: 카테고리별 제한된 건수만 */
function buildMainMessage(categorized: Record<string, Article[]>): string {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\. /g, '.').replace(/\.$/, '');

  let shownTotal = 0;
  const fullTotal = Object.values(categorized).reduce((s, a) => s + a.length, 0);

  const lines = [`📮 *[창업 정책 위클리 다이제스트]* ${today}`, ''];

  for (const category of CATEGORY_ORDER) {
    const articles = categorized[category];
    if (!articles?.length) continue;

    const limit = CATEGORY_LIMITS[category];
    const display = limit === null ? articles : articles.slice(0, limit);
    const overflow = articles.length - display.length;
    shownTotal += display.length;

    lines.push(`*${category}* (${articles.length}건)`);
    for (const a of display) {
      lines.push(formatArticle(a));
    }
    if (overflow > 0) {
      lines.push(`  _…외 ${overflow}건 (스레드에서 전체 확인)_`);
    }
    lines.push('');
  }

  lines.push(`총 *${shownTotal}건* 표시 (전체 ${fullTotal}건)`);
  lines.push('_💬 스레드에서 전체 목록을 확인하세요_');

  return lines.join('\n');
}

/** 스레드 메시지 구성: 전체 목록 */
function buildThreadMessage(categorized: Record<string, Article[]>): string {
  const total = Object.values(categorized).reduce((s, a) => s + a.length, 0);
  const lines = [`📎 *전체 목록* (${total}건)`, ''];

  for (const category of CATEGORY_ORDER) {
    const articles = categorized[category];
    if (!articles?.length) continue;

    lines.push(`*${category}* (${articles.length}건)`);
    for (const a of articles) {
      lines.push(formatArticle(a));
    }
    lines.push('');
  }

  lines.push('_자동 수집 by Startup Policy Digest_');
  return lines.join('\n');
}

/** Slack Bot Token으로 메인 메시지 + 스레드 답글 전송 */
async function sendViaBot(categorized: Record<string, Article[]>): Promise<boolean> {
  const client = new WebClient(SLACK_BOT_TOKEN);

  try {
    // 채널 자동 참여
    try {
      await client.conversations.join({ channel: SLACK_CHANNEL_ID });
    } catch { /* 이미 참여중이거나 권한 없으면 무시 */ }

    // 메인 메시지
    const mainText = buildMainMessage(categorized);
    const result = await client.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      text: mainText,
      unfurl_links: false,
      unfurl_media: false,
    });
    const threadTs = result.ts;

    // 스레드 답글
    const threadText = buildThreadMessage(categorized);
    await client.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      text: threadText,
      thread_ts: threadTs,
      unfurl_links: false,
      unfurl_media: false,
    });

    console.log('[Notifier] Slack 전송 성공! (메인 + 스레드)');
    return true;
  } catch (e) {
    console.error('[Notifier] Slack API 오류:', e);
    // Bot Token 실패 시 Webhook 폴백
    if (SLACK_WEBHOOK_URL) {
      console.log('[Notifier] Webhook으로 폴백합니다.');
      return sendViaWebhook(categorized);
    }
    return false;
  }
}

/** Webhook 폴백: 메인 메시지만 전송 */
async function sendViaWebhook(categorized: Record<string, Article[]>): Promise<boolean> {
  const mainText = buildMainMessage(categorized);
  const payload = { text: mainText, unfurl_links: false, unfurl_media: false };

  try {
    const resp = await globalThis.fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.error(`[Notifier] Webhook HTTP ${resp.status}`);
      return false;
    }

    console.log('[Notifier] Slack 전송 성공! (Webhook, 스레드 미지원)');
    return true;
  } catch (e) {
    console.error('[Notifier] Slack Webhook 전송 실패:', e);
    return false;
  }
}

/** Slack으로 다이제스트를 전송 */
export async function sendSlack(categorized: Record<string, Article[]>): Promise<boolean> {
  if (!categorized || Object.keys(categorized).length === 0) {
    console.log('[Notifier] 전송할 새로운 소식이 없습니다.');
    return true;
  }

  // 전송된 기사 URL 수집 (DB 업데이트용)
  const allUrls = Object.values(categorized).flatMap((articles) => articles.map((a) => a.url));

  let success = false;

  // Bot Token 우선
  if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
    success = await sendViaBot(categorized);
  } else if (SLACK_WEBHOOK_URL) {
    success = await sendViaWebhook(categorized);
  } else {
    console.error('[Notifier] Slack 전송 수단이 설정되지 않았습니다.');
    return false;
  }

  // 전송 성공 시 DB 업데이트
  if (success) {
    await markNotified(allUrls);
  }

  return success;
}
