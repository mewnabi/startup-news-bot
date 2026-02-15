"""Slack 메시지 전송: 메인 요약 + 스레드 전체 목록."""

from __future__ import annotations

import logging
from datetime import datetime

import requests
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from src.config import SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, SLACK_WEBHOOK_URL
from src.crawlers.base import Article
from src.processor import CAT_NEWS, CAT_NEW, CAT_URGENT, LIMITS

logger = logging.getLogger(__name__)

# 메인 메시지 카테고리 순서
CATEGORY_ORDER = [CAT_URGENT, CAT_NEW, CAT_NEWS]


def _format_article(a: Article) -> str:
    """기사 한 줄 포맷팅."""
    parts = [f"• <{a.url}|{a.title}>"]
    info = [a.source]

    if a.category == CAT_URGENT and a.d_day is not None:
        dl = a.deadline.replace("-", ".")
        info.append(f"마감 {dl[5:]} (D-{a.d_day})")
    elif a.deadline:
        dl = a.deadline.replace("-", ".")
        info.append(f"마감 {dl[5:]}")
        if a.date:
            info.append(f"등록 {a.date[5:].replace('-', '.')}")
    else:
        if a.date:
            info.append(a.date[5:].replace("-", "."))

    parts.append(f"  └ {' | '.join(info)}")
    return "\n".join(parts)


def _build_main_message(categorized: dict[str, list[Article]]) -> str:
    """메인 메시지: 카테고리별 제한된 건수만 표시."""
    today = datetime.now().strftime("%Y.%m.%d")
    shown_total = 0
    full_total = sum(len(v) for v in categorized.values())

    lines = [
        f"📮 *[창업 정책 위클리 다이제스트]* {today}",
        "",
    ]

    for category in CATEGORY_ORDER:
        articles = categorized.get(category, [])
        if not articles:
            continue

        limit = LIMITS.get(category)
        display = articles if limit is None else articles[:limit]
        overflow = len(articles) - len(display)
        shown_total += len(display)

        lines.append(f"*{category}* ({len(articles)}건)")
        for a in display:
            lines.append(_format_article(a))
        if overflow > 0:
            lines.append(f"  _…외 {overflow}건 (스레드에서 전체 확인)_")
        lines.append("")

    lines.append(f"총 *{shown_total}건* 표시 (전체 {full_total}건)")
    lines.append("_💬 스레드에서 전체 목록을 확인하세요_")

    return "\n".join(lines)


def _build_thread_message(categorized: dict[str, list[Article]]) -> str:
    """스레드 메시지: 전체 목록."""
    total = sum(len(v) for v in categorized.values())
    lines = [
        f"📎 *전체 목록* ({total}건)",
        "",
    ]

    for category in CATEGORY_ORDER:
        articles = categorized.get(category, [])
        if not articles:
            continue

        lines.append(f"*{category}* ({len(articles)}건)")
        for a in articles:
            lines.append(_format_article(a))
        lines.append("")

    lines.append("_자동 수집 by Startup Policy Digest_")
    return "\n".join(lines)


def _send_via_bot(categorized: dict[str, list[Article]]) -> bool:
    """Slack Bot Token으로 메인 메시지 + 스레드 답글 전송."""
    client = WebClient(token=SLACK_BOT_TOKEN)

    try:
        # 메인 메시지
        main_text = _build_main_message(categorized)
        result = client.chat_postMessage(
            channel=SLACK_CHANNEL_ID,
            text=main_text,
            unfurl_links=False,
            unfurl_media=False,
        )
        thread_ts = result["ts"]

        # 스레드 답글 (전체 목록)
        thread_text = _build_thread_message(categorized)
        client.chat_postMessage(
            channel=SLACK_CHANNEL_ID,
            text=thread_text,
            thread_ts=thread_ts,
            unfurl_links=False,
            unfurl_media=False,
        )

        logger.info("Slack 전송 성공! (메인 + 스레드)")
        return True
    except SlackApiError as e:
        logger.error("Slack API 오류: %s", e.response["error"])
        return False


def _send_via_webhook(categorized: dict[str, list[Article]]) -> bool:
    """Webhook 폴백: 메인 메시지만 전송 (스레드 불가)."""
    main_text = _build_main_message(categorized)
    payload = {"text": main_text, "unfurl_links": False, "unfurl_media": False}

    try:
        resp = requests.post(SLACK_WEBHOOK_URL, json=payload, timeout=10)
        resp.raise_for_status()
        logger.info("Slack 전송 성공! (Webhook, 스레드 미지원)")
        return True
    except requests.RequestException as e:
        logger.error("Slack Webhook 전송 실패: %s", e)
        return False


def send_slack(categorized: dict[str, list[Article]]) -> bool:
    """Slack으로 다이제스트를 전송한다.

    Bot Token이 있으면 메인+스레드, 없으면 Webhook으로 메인만 전송.
    """
    if not categorized:
        logger.info("전송할 새로운 소식이 없습니다.")
        return True

    # Bot Token 우선
    if SLACK_BOT_TOKEN and SLACK_CHANNEL_ID:
        return _send_via_bot(categorized)

    # Webhook 폴백
    if SLACK_WEBHOOK_URL:
        return _send_via_webhook(categorized)

    logger.error("Slack 전송 수단이 설정되지 않았습니다. (BOT_TOKEN 또는 WEBHOOK_URL 필요)")
    return False
