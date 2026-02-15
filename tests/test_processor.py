"""프로세서 단위 테스트."""

from datetime import datetime, timedelta
from unittest.mock import patch

from src.crawlers.base import Article
from src.processor import CAT_NEWS, CAT_NEW, CAT_URGENT, classify, process


def _make_article(
    title: str = "테스트",
    days_ago: int = 1,
    url: str = "",
    source: str = "K-Startup",
    deadline_days: int | None = None,
) -> Article:
    date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
    deadline = ""
    if deadline_days is not None:
        deadline = (datetime.now() + timedelta(days=deadline_days)).strftime("%Y-%m-%d")
    return Article(
        title=title,
        url=url or f"https://example.com/{title}/{days_ago}",
        source=source,
        date=date,
        deadline=deadline,
    )


class TestClassify:
    def test_urgent_within_7_days(self):
        a = _make_article("마감 임박 공고", deadline_days=3)
        assert classify(a) == CAT_URGENT

    def test_not_urgent_beyond_7_days(self):
        a = _make_article("여유 있는 공고", deadline_days=30)
        assert classify(a) == CAT_NEW

    def test_news_source(self):
        a = _make_article("정책 뉴스", source="네이버뉴스")
        assert classify(a) == CAT_NEWS

    def test_mss_is_news(self):
        a = _make_article("중기부 보도자료", source="중소벤처기업부")
        assert classify(a) == CAT_NEWS

    def test_no_deadline_is_new(self):
        a = _make_article("일반 공고", source="기업마당")
        assert classify(a) == CAT_NEW


class TestProcess:
    @patch("src.processor.load_history", return_value=set())
    @patch("src.processor.save_history")
    def test_filters_old_news(self, mock_save, mock_load):
        articles = [
            _make_article("최신 뉴스", days_ago=1, source="네이버뉴스"),
            _make_article("오래된 뉴스", days_ago=30, source="네이버뉴스"),
        ]
        result = process(articles)
        all_titles = [a.title for cat in result.values() for a in cat]
        assert "최신 뉴스" in all_titles
        assert "오래된 뉴스" not in all_titles

    @patch("src.processor.load_history", return_value=set())
    @patch("src.processor.save_history")
    def test_excludes_expired_deadlines(self, mock_save, mock_load):
        articles = [
            _make_article("마감된 공고", deadline_days=-3),
            _make_article("진행중 공고", deadline_days=10),
        ]
        result = process(articles)
        all_titles = [a.title for cat in result.values() for a in cat]
        assert "마감된 공고" not in all_titles
        assert "진행중 공고" in all_titles

    @patch("src.processor.load_history", return_value={"https://example.com/old"})
    @patch("src.processor.save_history")
    def test_removes_duplicates(self, mock_save, mock_load):
        articles = [
            _make_article("중복 기사", url="https://example.com/old"),
            _make_article("신규 기사", url="https://example.com/new"),
        ]
        result = process(articles)
        all_titles = [a.title for cat in result.values() for a in cat]
        assert "중복 기사" not in all_titles
        assert "신규 기사" in all_titles

    @patch("src.processor.load_history", return_value=set())
    @patch("src.processor.save_history")
    def test_categorizes_correctly(self, mock_save, mock_load):
        articles = [
            _make_article("마감 임박", deadline_days=3, source="K-Startup"),
            _make_article("일반 공고", deadline_days=30, source="기업마당"),
            _make_article("정책 뉴스", source="네이버뉴스"),
        ]
        result = process(articles)
        assert CAT_URGENT in result
        assert CAT_NEW in result
        assert CAT_NEWS in result

    @patch("src.processor.load_history", return_value=set())
    @patch("src.processor.save_history")
    def test_empty_input(self, mock_save, mock_load):
        result = process([])
        assert result == {}
