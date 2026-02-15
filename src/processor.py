"""수집된 기사 처리: 중복 제거, 날짜 필터링, 카테고리 분류."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta

from src.config import DAYS_LOOKBACK, HISTORY_FILE
from src.crawlers.base import Article

logger = logging.getLogger(__name__)

# 카테고리 분류 키워드 매핑
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "📋 지원사업 공고": [
        "공고", "모집", "신청", "접수", "패키지", "바우처", "사업공고",
        "지원사업", "참여기업", "선정",
    ],
    "💰 투자/자금 지원": [
        "투자", "펀드", "자금", "대출", "보증", "융자", "출자",
    ],
    "🎓 교육/멘토링": [
        "교육", "멘토링", "컨설팅", "아카데미", "특강", "워크숍", "세미나",
    ],
    "📰 정책 뉴스": [],  # 기본 카테고리 (매칭 안 되면 여기로)
}


def classify(article: Article) -> str:
    """기사 제목 기반으로 카테고리 분류."""
    title = article.title
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in title for kw in keywords):
            return category
    return "📰 정책 뉴스"


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
    """기사 목록을 처리하여 카테고리별로 분류된 딕셔너리 반환.

    1. 날짜 필터링 (최근 N일)
    2. 중복 제거 (이전 전송 이력 기반)
    3. 카테고리 분류
    4. 전송 이력 업데이트
    """
    cutoff = datetime.now() - timedelta(days=DAYS_LOOKBACK)
    history = load_history()
    result: dict[str, list[Article]] = {}
    new_urls: set[str] = set()

    for article in articles:
        # 날짜 필터링
        dt = article.date_obj
        if dt and dt < cutoff:
            continue

        # 중복 제거
        if article.url in history:
            continue

        # 카테고리 분류
        article.category = classify(article)
        result.setdefault(article.category, []).append(article)
        new_urls.add(article.url)

    # 각 카테고리 내에서 날짜 역순 정렬
    for cat in result:
        result[cat].sort(key=lambda a: a.date, reverse=True)

    # 전송 이력 업데이트
    if new_urls:
        save_history(history | new_urls)

    total = sum(len(v) for v in result.values())
    logger.info("처리 완료: 총 %d건 (신규), %d건 필터링됨", total, len(articles) - total)
    return result
