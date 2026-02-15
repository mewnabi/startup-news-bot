"""Slack Incoming Webhook을 통한 메시지 전송."""

from __future__ import annotations

import logging
from datetime import datetime

import requests

from src.config import SLACK_WEBHOOK_URL
from src.crawlers.base import Article

logger = logging.getLogger(__name__)

# 카테고리 표시 순서
CATEGORY_ORDER = [
    "📋 지원사업 공고",
    "💰 투자/자금 지원",
    "🎓 교육/멘토링",
    "📰 정책 뉴스",
]


def _build_message(categorized: dict[str, list[Article]]) -> str:
    """카테고리별 기사 목록을 Slack 메시지 텍스트로 포맷팅."""
    today = datetime.now().strftime("%Y.%m.%d")
    total = sum(len(v) for v in categorized.values())

    lines = [
        f"📮 *[창업 정책 위클리 다이제스트]* {today}",
        "",
        "━━━━━━━━━━━━━━━━━━━━━━━",
        "",
    ]

    for category in CATEGORY_ORDER:
        articles = categorized.get(category, [])
        if not articles:
            continue

        lines.append(f"*{category}* ({len(articles)}건)")
        for a in articles:
            lines.append(f"• <{a.url}|{a.title}>")
            lines.append(f"  └ {a.source} | {a.date}")
        lines.append("")

    lines.append("━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"총 *{total}건* | 자동 수집 by Startup Policy Digest")

    return "\n".join(lines)


def send_slack(categorized: dict[str, list[Article]]) -> bool:
    """Slack으로 다이제스트 메시지를 전송한다.

    Returns:
        True이면 전송 성공, False이면 실패.
    """
    if not categorized:
        logger.info("전송할 새로운 소식이 없습니다.")
        return True

    if not SLACK_WEBHOOK_URL:
        logger.error("SLACK_WEBHOOK_URL이 설정되지 않았습니다.")
        return False

    text = _build_message(categorized)
    payload = {"text": text, "unfurl_links": False, "unfurl_media": False}

    try:
        resp = requests.post(SLACK_WEBHOOK_URL, json=payload, timeout=10)
        resp.raise_for_status()
        logger.info("Slack 전송 성공!")
        return True
    except requests.RequestException as e:
        logger.error("Slack 전송 실패: %s", e)
        return False
