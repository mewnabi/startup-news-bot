"""크롤러 베이스 클래스."""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime

import requests

from src.config import REQUEST_DELAY, REQUEST_TIMEOUT, USER_AGENT

logger = logging.getLogger(__name__)


@dataclass
class Article:
    """수집된 기사/공고 데이터."""

    title: str
    url: str
    source: str
    date: str  # YYYY-MM-DD
    category: str = ""  # 자동 분류됨
    extra: dict = field(default_factory=dict)

    @property
    def date_obj(self) -> datetime | None:
        try:
            return datetime.strptime(self.date, "%Y-%m-%d")
        except ValueError:
            return None

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "source": self.source,
            "date": self.date,
            "category": self.category,
        }


class BaseCrawler(ABC):
    """크롤러 베이스 클래스."""

    name: str = "base"

    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})

    def fetch(self, url: str, **kwargs) -> requests.Response | None:
        """URL을 요청하고 응답을 반환한다. 실패 시 None."""
        try:
            time.sleep(REQUEST_DELAY)
            resp = self.session.get(url, timeout=REQUEST_TIMEOUT, **kwargs)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            logger.warning("[%s] 요청 실패: %s — %s", self.name, url, e)
            return None

    @abstractmethod
    def crawl(self) -> list[Article]:
        """기사 목록을 크롤링하여 반환한다."""
        ...
