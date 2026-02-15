"""K-Startup (k-startup.go.kr) 크롤러.

실제 HTML 구조:
- div#bizPbancList > ul > li 형태의 카드 리스트
- 각 li 내부: .middle > a[href=javascript:go_view(ID)] > .tit_wrap > p.tit (제목)
- 날짜: .bottom > span.list 안에 "등록일자 YYYY-MM-DD" 텍스트
- go_view(pbancSn) → ?schM=view&pbancSn={ID} 로 이동
"""

from __future__ import annotations

import logging
import re
from datetime import datetime

from bs4 import BeautifulSoup

from .base import Article, BaseCrawler

logger = logging.getLogger(__name__)

BASE_URL = "https://www.k-startup.go.kr"
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

        # div#bizPbancList > ul > li
        container = soup.select_one("#bizPbancList")
        if not container:
            logger.warning("[%s] #bizPbancList 컨테이너를 찾을 수 없습니다.", self.name)
            return []

        items = container.select("ul > li")
        for item in items:
            article = self._parse_item(item)
            if article:
                articles.append(article)

        logger.info("[%s] %d건 수집 완료", self.name, len(articles))
        return articles

    def _parse_item(self, item) -> Article | None:
        """li 요소에서 공고 정보를 추출."""
        # 제목: p.tit
        tit_el = item.select_one("p.tit")
        if not tit_el:
            return None
        title = tit_el.get_text(strip=True)
        if not title:
            return None

        # URL: a[href=javascript:go_view(ID)]에서 ID 추출
        link = item.select_one("div.middle a")
        url = LIST_URL
        if link:
            href = link.get("href", "")
            match = re.search(r"go_view\((\d+)\)", href)
            if match:
                pbanc_sn = match.group(1)
                url = f"{LIST_URL}?schM=view&pbancSn={pbanc_sn}"

        # 날짜: .bottom > span.list 에서 등록일자/마감일자 추출
        date, deadline = self._extract_dates(item)

        return Article(title=title, url=url, source=self.name, date=date, deadline=deadline)

    def _extract_dates(self, item) -> tuple[str, str]:
        """등록일자와 마감일자를 추출."""
        date = ""
        deadline = ""
        spans = item.select("div.bottom span.list")
        for span in spans:
            text = span.get_text(strip=True)
            match = re.search(r"(\d{4}-\d{2}-\d{2})", text)
            if not match:
                continue
            if "등록일자" in text:
                date = match.group(1)
            elif "마감일자" in text:
                deadline = match.group(1)
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        return date, deadline
