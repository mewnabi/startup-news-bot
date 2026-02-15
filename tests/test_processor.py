"""프로세서 단위 테스트."""

from datetime import datetime, timedelta
from unittest.mock import patch

from src.crawlers.base import Article
from src.processor import classify, process


def _make_article(title: str = "테스트", days_ago: int = 1, url: str = "") -> Article:
    date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
    return Article(
        title=title,
        url=url or f"https://example.com/{title}/{days_ago}",
        source="테스트",
        date=date,
    )


class TestClassify:
    def test_support_program(self):
        a = _make_article("2026년 예비창업패키지 모집 공고")
        assert "지원사업" in classify(a)

    def test_investment(self):
        a = _make_article("스타트업 투자 펀드 조성")
        assert "투자" in classify(a)

    def test_education(self):
        a = _make_article("창업 멘토링 프로그램 개최")
        assert "교육" in classify(a)

    def test_default_news(self):
        a = _make_article("중기부 장관 간담회")
        assert "정책 뉴스" in classify(a)


class TestProcess:
    @patch("src.processor.load_history", return_value=set())
    @patch("src.processor.save_history")
    def test_filters_old_articles(self, mock_save, mock_load):
        articles = [
            _make_article("최신 기사", days_ago=1),
            _make_article("오래된 기사", days_ago=30),
        ]
        result = process(articles)
        all_articles = [a for cat in result.values() for a in cat]
        titles = [a.title for a in all_articles]
        assert "최신 기사" in titles
        assert "오래된 기사" not in titles

    @patch("src.processor.load_history", return_value={"https://example.com/old"})
    @patch("src.processor.save_history")
    def test_removes_duplicates(self, mock_save, mock_load):
        articles = [
            _make_article("중복 기사", url="https://example.com/old"),
            _make_article("신규 기사", url="https://example.com/new"),
        ]
        result = process(articles)
        all_articles = [a for cat in result.values() for a in cat]
        titles = [a.title for a in all_articles]
        assert "중복 기사" not in titles
        assert "신규 기사" in titles

    @patch("src.processor.load_history", return_value=set())
    @patch("src.processor.save_history")
    def test_categorizes_articles(self, mock_save, mock_load):
        articles = [
            _make_article("창업패키지 모집 공고"),
            _make_article("스타트업 투자 확대"),
        ]
        result = process(articles)
        categories = list(result.keys())
        assert len(categories) == 2

    @patch("src.processor.load_history", return_value=set())
    @patch("src.processor.save_history")
    def test_empty_input(self, mock_save, mock_load):
        result = process([])
        assert result == {}
