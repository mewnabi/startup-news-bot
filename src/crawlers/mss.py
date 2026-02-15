"""중소벤처기업부 (mss.go.kr) 보도자료 크롤러."""

from __future__ import annotations

import logging
import re
from datetime import datetime

from bs4 import BeautifulSoup

from .base import Article, BaseCrawler

logger = logging.getLogger(__name__)

BASE_URL = "https://www.mss.go.kr"
# cbIdx=86: 보도자료 게시판
LIST_URL = f"{BASE_URL}/site/smba/ex/bbs/List.do"
BOARD_ID = "86"


class MSSCrawler(BaseCrawler):
    """중소벤처기업부 보도자료 크롤러."""

    name = "중소벤처기업부"

    def crawl(self) -> list[Article]:
        params = {"cbIdx": BOARD_ID, "pageIndex": "1"}
        resp = self.fetch(LIST_URL, params=params)
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
            "table tbody tr",
        ]
        for sel in selectors:
            rows = soup.select(sel)
            if rows:
                return rows
        return []

    def _parse_row(self, row) -> Article | None:
        cols = row.select("td")
        if len(cols) < 3:
            return None

        link = row.select_one("a")
        if not link:
            return None

        title = link.get_text(strip=True)
        if not title:
            return None

        url = self._extract_url(link)
        date = self._extract_date(cols)

        return Article(title=title, url=url, source=self.name, date=date)

    def _extract_url(self, link) -> str:
        href = link.get("href", "")
        if href and href.startswith("http"):
            return href
        if href and href.startswith("/"):
            return BASE_URL + href

        # onclick 핸들러 파싱
        onclick = link.get("onclick", "")
        if onclick:
            # fn_detail('86', '12345') 패턴
            match = re.search(r"'(\d+)'\s*,\s*'(\d+)'", onclick)
            if match:
                board_id, article_id = match.groups()
                return f"{BASE_URL}/site/smba/ex/bbs/View.do?cbIdx={board_id}&bcIdx={article_id}"
            # 단순 숫자 ID
            match = re.search(r"(\d{4,})", onclick)
            if match:
                return f"{BASE_URL}/site/smba/ex/bbs/View.do?cbIdx={BOARD_ID}&bcIdx={match.group(1)}"

        return LIST_URL

    def _extract_date(self, cols: list) -> str:
        """컬럼들에서 날짜 형식을 찾아 반환."""
        for col in cols:
            text = col.get_text(strip=True)
            match = re.match(r"^(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})$", text)
            if match:
                y, m, d = match.groups()
                try:
                    dt = datetime(int(y), int(m), int(d))
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    pass
        return datetime.now().strftime("%Y-%m-%d")
