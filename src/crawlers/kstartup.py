"""K-Startup (k-startup.go.kr) 크롤러."""

from __future__ import annotations

import logging
import re
from datetime import datetime

from bs4 import BeautifulSoup

from .base import Article, BaseCrawler

logger = logging.getLogger(__name__)

BASE_URL = "https://www.k-startup.go.kr"
# 진행중 사업공고 목록
LIST_URL = f"{BASE_URL}/web/contents/bizpbanc-ongoing.do"


class KStartupCrawler(BaseCrawler):
    """K-Startup 진행중 사업공고 크롤러."""

    name = "K-Startup"

    def crawl(self) -> list[Article]:
        resp = self.fetch(LIST_URL)
        if resp is None:
            return []

        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        articles: list[Article] = []

        # 테이블 기반 목록 파싱 시도
        rows = self._find_rows(soup)
        for row in rows:
            article = self._parse_row(row)
            if article:
                articles.append(article)

        # 카드/리스트 기반 파싱 시도 (테이블이 없는 경우)
        if not articles:
            articles = self._parse_card_layout(soup)

        logger.info("[%s] %d건 수집 완료", self.name, len(articles))
        return articles

    def _find_rows(self, soup: BeautifulSoup) -> list:
        """테이블 행 목록을 찾는다. 여러 셀렉터로 시도."""
        selectors = [
            "table.tbl_type tbody tr",
            "table.boardList tbody tr",
            "table.bbs_list tbody tr",
            "div.board_list table tbody tr",
            "div.list_wrap table tbody tr",
            "table tbody tr",
        ]
        for sel in selectors:
            rows = soup.select(sel)
            if rows:
                return rows
        return []

    def _parse_row(self, row) -> Article | None:
        """테이블 행에서 기사 정보를 추출."""
        link = row.select_one("a")
        if not link:
            return None

        title = link.get_text(strip=True)
        if not title:
            return None

        href = link.get("href", "")
        url = self._resolve_url(href, link)

        date = self._extract_date(row)

        return Article(title=title, url=url, source=self.name, date=date)

    def _parse_card_layout(self, soup: BeautifulSoup) -> list[Article]:
        """카드/리스트 레이아웃 파싱."""
        articles: list[Article] = []
        selectors = [
            "ul.card_list li",
            "div.list_item",
            "div.card_wrap div.card",
            "ul.biz_list li",
        ]
        for sel in selectors:
            items = soup.select(sel)
            if not items:
                continue
            for item in items:
                link = item.select_one("a")
                if not link:
                    continue
                title = link.get_text(strip=True)
                href = link.get("href", "")
                url = self._resolve_url(href, link)
                date = self._extract_date(item)
                if title:
                    articles.append(
                        Article(title=title, url=url, source=self.name, date=date)
                    )
            if articles:
                break
        return articles

    def _resolve_url(self, href: str, element) -> str:
        """href 또는 onclick에서 URL을 추출."""
        if href and href.startswith("http"):
            return href
        if href and href.startswith("/"):
            return BASE_URL + href

        # onclick 핸들러에서 URL 추출 시도
        onclick = element.get("onclick", "")
        if onclick:
            match = re.search(r"'(/[^']+)'", onclick)
            if match:
                return BASE_URL + match.group(1)
            # ID 기반 함수 호출 패턴
            match = re.search(r"\d{5,}", onclick)
            if match:
                return f"{BASE_URL}/web/contents/bizpbanc-detail.do?pblancId={match.group(0)}"

        return href if href else LIST_URL

    def _extract_date(self, element) -> str:
        """요소에서 날짜를 추출. YYYY-MM-DD 형식으로 반환."""
        text = element.get_text()
        # YYYY-MM-DD 또는 YYYY.MM.DD 패턴
        match = re.search(r"(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})", text)
        if match:
            y, m, d = match.groups()
            try:
                dt = datetime(int(y), int(m), int(d))
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
        return datetime.now().strftime("%Y-%m-%d")
