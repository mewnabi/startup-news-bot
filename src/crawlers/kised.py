"""창업진흥원 (kised.or.kr) 사업공고 크롤러.

실제 HTML 구조:
- URL: /menu.es?mid=a10302000000 (사업공고)
- ul.lstyle_list > li 형태
- 각 li: a > b.ls_tit (제목), href가 k-startup.go.kr 상세 링크
- dl.clearfix 안에 기관명, 마감일자 정보
- span.state 안에 진행 상태 (진행중/마감 등)
"""

from __future__ import annotations

import logging
import re
from datetime import datetime

from bs4 import BeautifulSoup

from .base import Article, BaseCrawler

logger = logging.getLogger(__name__)

BASE_URL = "https://www.kised.or.kr"
LIST_URL = f"{BASE_URL}/menu.es?mid=a10302000000"


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

        # ul.lstyle_list > li
        items = soup.select("ul.lstyle_list > li")
        if not items:
            logger.warning("[%s] ul.lstyle_list를 찾을 수 없습니다.", self.name)
            return []

        for item in items:
            article = self._parse_item(item)
            if article:
                articles.append(article)

        logger.info("[%s] %d건 수집 완료", self.name, len(articles))
        return articles

    def _parse_item(self, item) -> Article | None:
        """li 요소에서 공고 정보를 추출."""
        # 제목: b.ls_tit
        tit_el = item.select_one("b.ls_tit")
        if not tit_el:
            return None
        title = tit_el.get_text(strip=True)
        if not title:
            return None

        # URL: a 태그의 href (k-startup.go.kr 상세 링크)
        link = item.select_one("a[href]")
        url = LIST_URL
        if link:
            href = link.get("href", "")
            if href and href.startswith("http"):
                url = href
            elif href and href.startswith("/"):
                url = BASE_URL + href

        # 마감일자: dl > dd 에서 날짜 추출
        date = self._extract_date(item)

        return Article(title=title, url=url, source=self.name, date=date)

    def _extract_date(self, item) -> str:
        """마감일자를 추출. 없으면 오늘 날짜."""
        dds = item.select("dl dd")
        for dd in dds:
            text = dd.get_text(strip=True)
            match = re.match(r"(\d{4}-\d{2}-\d{2})", text)
            if match:
                return match.group(1)
        # 폴백
        text = item.get_text()
        match = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
        if match:
            return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
        return datetime.now().strftime("%Y-%m-%d")
