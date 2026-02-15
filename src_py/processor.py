"""수집된 기사 처리: 중복 제거, 날짜 필터링, 행동 기반 카테고리 분류."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta

from src.config import DAYS_LOOKBACK, HISTORY_FILE
from src.crawlers.base import Article

logger = logging.getLogger(__name__)

# 뉴스 소스 (마감일 없는 정보성 콘텐츠)
NEWS_SOURCES = {"네이버뉴스", "중소벤처기업부"}

# 카테고리 정의
CAT_URGENT = "🔥 마감 임박"
CAT_NEW = "📋 신규 공고"
CAT_NEWS = "📰 정책 동향"

# 메인 메시지 표시 제한
LIMITS = {
    CAT_URGENT: None,  # 전체 표시
    CAT_NEW: 10,
    CAT_NEWS: 5,
}

URGENT_DAYS = 7  # D-7 이내면 마감 임박


def classify(article: Article) -> str:
    """기사를 행동 기반 카테고리로 분류."""
    # 뉴스 소스 → 정책 동향
    if article.source in NEWS_SOURCES:
        return CAT_NEWS

    # 마감일이 있고 D-7 이내 → 마감 임박
    d_day = article.d_day
    if d_day is not None and 0 <= d_day <= URGENT_DAYS:
        return CAT_URGENT

    # 나머지 공고 → 신규 공고
    return CAT_NEW


def load_history() -> set[str]:
    """전송 이력(URL 목록)을 로드."""
    if not os.path.exists(HISTORY_FILE):
        return set()
    try:
        with open(HISTORY_FILE, encoding="utf-8") as f:
            return set(json.load(f))
    except (json.JSONDecodeError, OSError):
        return set()


def save_history(urls: set[str]) -> None:
    """전송 이력 저장. 최근 500건만 유지."""
    url_list = sorted(urls)[-500:]
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(url_list, f, ensure_ascii=False, indent=2)


def process(articles: list[Article]) -> dict[str, list[Article]]:
    """기사 목록을 처리하여 카테고리별로 분류된 딕셔너리 반환."""
    cutoff = datetime.now() - timedelta(days=DAYS_LOOKBACK)
    history = load_history()
    result: dict[str, list[Article]] = {}
    new_urls: set[str] = set()

    for article in articles:
        # 날짜 필터링 (뉴스만 — 공고는 마감 전이면 표시)
        if article.source in NEWS_SOURCES:
            dt = article.date_obj
            if dt and dt < cutoff:
                continue

        # 마감된 공고 제외
        d_day = article.d_day
        if d_day is not None and d_day < 0:
            continue

        # 중복 제거
        if article.url in history:
            continue

        # 카테고리 분류
        article.category = classify(article)
        result.setdefault(article.category, []).append(article)
        new_urls.add(article.url)

    # 마감 임박: D-day 오름차순 (급한 것 먼저)
    if CAT_URGENT in result:
        result[CAT_URGENT].sort(key=lambda a: a.d_day if a.d_day is not None else 999)

    # 신규 공고: 등록일 역순
    if CAT_NEW in result:
        result[CAT_NEW].sort(key=lambda a: a.date, reverse=True)

    # 정책 동향: 발행일 역순
    if CAT_NEWS in result:
        result[CAT_NEWS].sort(key=lambda a: a.date, reverse=True)

    # 전송 이력 업데이트
    if new_urls:
        save_history(history | new_urls)

    total = sum(len(v) for v in result.values())
    logger.info("처리 완료: 총 %d건 (신규), %d건 필터링됨", total, len(articles) - total)
    return result
