"""Startup Policy Digest — 메인 진입점."""

from __future__ import annotations

import logging
import sys

from src.crawlers import (
    BizinfoCrawler,
    KisedCrawler,
    KStartupCrawler,
    MSSCrawler,
    NaverNewsCrawler,
)
from src.crawlers.base import Article
from src.notifier import send_slack
from src.processor import process

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

CRAWLERS = [
    KStartupCrawler,
    MSSCrawler,
    KisedCrawler,
    BizinfoCrawler,
    NaverNewsCrawler,
]


def collect_all() -> list[Article]:
    """모든 크롤러를 실행하여 기사를 수집."""
    all_articles: list[Article] = []

    for crawler_cls in CRAWLERS:
        crawler = crawler_cls()
        try:
            articles = crawler.crawl()
            all_articles.extend(articles)
            logger.info("[%s] %d건 수집", crawler.name, len(articles))
        except Exception:
            logger.exception("[%s] 크롤링 중 오류 발생", crawler.name)

    logger.info("전체 수집 완료: 총 %d건", len(all_articles))
    return all_articles


def main() -> int:
    """메인 실행 함수."""
    logger.info("=== Startup Policy Digest 시작 ===")

    # 1. 수집
    articles = collect_all()
    if not articles:
        logger.warning("수집된 기사가 없습니다.")
        # 수집 실패해도 에러로 처리하지 않음
        return 0

    # 2. 처리 (필터링, 중복 제거, 분류)
    categorized = process(articles)
    if not categorized:
        logger.info("전송할 새로운 소식이 없습니다.")
        return 0

    total = sum(len(v) for v in categorized.values())
    logger.info("신규 소식 %d건 발견", total)

    # 3. Slack 전송
    success = send_slack(categorized)
    if not success:
        logger.error("Slack 전송 실패!")
        return 1

    logger.info("=== Startup Policy Digest 완료 ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
