"""창업진흥원 (kised.or.kr) 사업공고 크롤러."""

from __future__ import annotations

import logging
import re
from datetime import datetime

from bs4 import BeautifulSoup

from .base import Article, BaseCrawler

logger = logging.getLogger(__name__)

BASE_URL = "https://www.kised.or.kr"
# 사업공고 게시판
LIST_URL = f"{BASE_URL}/menu.es?mid=a10305010000"


class KisedCrawler(BaseCrawler):
    """창업진흥원 사업공고 크롤러."""

    name = "창업진흥원"

    def crawl(self) -> list[Article]:
        resp = self.fetch(LIST_URL)
        if resp is None:
            return []

        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        articles: list[Article] = []

        rows = self._find_rows(soup)
        for row in rows:
            article = self._parse_row(row)
            if article:
                articles.append(article)

        logger.info("[%s] %d건 수집 완료", self.name, len(articles))
        return articles

    def _find_rows(self, soup: BeautifulSoup) -> list:
        selectors = [
            "table.boardList tbody tr",
            "table.bbs_list tbody tr",
            "div.board_list table tbody tr",
            "table.tbl_type tbody tr",
            "div.bbs_list_wrap table tbody tr",
            "table tbody tr",
        ]
        for sel in selectors:
            rows = soup.select(sel)
            if rows:
                return rows
        return []

    def _parse_row(self, row) -> Article | None:
        cols = row.select("td")
        if len(cols) < 2:
            return None

        link = row.select_one("a")
        if not link:
            return None

        title = link.get_text(strip=True)
        if not title:
            return None

        url = self._extract_url(link)
        date = self._extract_date(row)

        return Article(title=title, url=url, source=self.name, date=date)

    def _extract_url(self, link) -> str:
        href = link.get("href", "")
        if href and href.startswith("http"):
            return href
        if href and href.startswith("/"):
            return BASE_URL + href

        onclick = link.get("onclick", "")
        if onclick:
            match = re.search(r"'(/[^']+)'", onclick)
            if match:
                return BASE_URL + match.group(1)
            match = re.search(r"(\d{4,})", onclick)
            if match:
                return f"{BASE_URL}/board.es?mid=a10305010000&bid=0005&act=view&otp_id={match.group(1)}"

        return LIST_URL

    def _extract_date(self, element) -> str:
        text = element.get_text()
        match = re.search(r"(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})", text)
        if match:
            y, m, d = match.groups()
            try:
                dt = datetime(int(y), int(m), int(d))
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
        return datetime.now().strftime("%Y-%m-%d")
