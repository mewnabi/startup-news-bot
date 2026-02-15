"""네이버 뉴스 검색 API 크롤러."""

from __future__ import annotations

import html
import logging
import re
from datetime import datetime

from src.config import NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, SEARCH_KEYWORDS

from .base import Article, BaseCrawler

logger = logging.getLogger(__name__)

API_URL = "https://openapi.naver.com/v1/search/news.json"


def _strip_html(text: str) -> str:
    """HTML 태그 및 엔티티 제거."""
    text = html.unescape(text)
    return re.sub(r"<[^>]+>", "", text).strip()


def _parse_date(date_str: str) -> str:
    """네이버 API 날짜(RFC 2822)를 YYYY-MM-DD로 변환."""
    # 예: "Mon, 10 Feb 2026 09:00:00 +0900"
    try:
        dt = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %z")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return ""


class NaverNewsCrawler(BaseCrawler):
    """네이버 뉴스 검색 API를 통한 창업 관련 뉴스 수집."""

    name = "네이버뉴스"

    def crawl(self) -> list[Article]:
        if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
            logger.warning("[%s] API 키가 설정되지 않았습니다.", self.name)
            return []

        self.session.headers.update(
            {
                "X-Naver-Client-Id": NAVER_CLIENT_ID,
                "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
            }
        )

        articles: list[Article] = []
        seen_urls: set[str] = set()

        for keyword in SEARCH_KEYWORDS:
            params = {
                "query": keyword,
                "display": 10,
                "start": 1,
                "sort": "date",  # 최신순
            }
            resp = self.fetch(API_URL, params=params)
            if resp is None:
                continue

            data = resp.json()
            for item in data.get("items", []):
                url = item.get("originallink") or item.get("link", "")
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                articles.append(
                    Article(
                        title=_strip_html(item.get("title", "")),
                        url=url,
                        source=self.name,
                        date=_parse_date(item.get("pubDate", "")),
                    )
                )

        logger.info("[%s] %d건 수집 완료", self.name, len(articles))
        return articles
