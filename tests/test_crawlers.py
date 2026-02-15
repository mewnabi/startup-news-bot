"""크롤러 단위 테스트."""

from unittest.mock import MagicMock, patch

from src.crawlers.base import Article
from src.crawlers.naver_news import NaverNewsCrawler, _parse_date, _strip_html


class TestStripHtml:
    def test_removes_tags(self):
        assert _strip_html("<b>테스트</b>") == "테스트"

    def test_unescapes_entities(self):
        assert _strip_html("&amp;") == "&"
        assert _strip_html("&lt;hello&gt;") == ""

    def test_plain_text(self):
        assert _strip_html("일반 텍스트") == "일반 텍스트"


class TestParseDate:
    def test_valid_rfc2822(self):
        assert _parse_date("Mon, 10 Feb 2026 09:00:00 +0900") == "2026-02-10"

    def test_invalid_format(self):
        assert _parse_date("invalid") == ""


class TestNaverNewsCrawler:
    @patch("src.crawlers.naver_news.NAVER_CLIENT_ID", "test_id")
    @patch("src.crawlers.naver_news.NAVER_CLIENT_SECRET", "test_secret")
    def test_crawl_parses_api_response(self):
        crawler = NaverNewsCrawler()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "items": [
                {
                    "title": "<b>창업</b> 지원사업 공고",
                    "originallink": "https://example.com/news/1",
                    "link": "https://n.news.naver.com/1",
                    "pubDate": "Mon, 10 Feb 2026 09:00:00 +0900",
                },
                {
                    "title": "스타트업 &amp; 정책",
                    "originallink": "",
                    "link": "https://n.news.naver.com/2",
                    "pubDate": "Tue, 11 Feb 2026 10:00:00 +0900",
                },
            ]
        }
        crawler.fetch = MagicMock(return_value=mock_resp)

        articles = crawler.crawl()

        assert len(articles) >= 2
        assert articles[0].title == "창업 지원사업 공고"
        assert articles[0].url == "https://example.com/news/1"
        assert articles[0].date == "2026-02-10"
        assert articles[1].title == "스타트업 & 정책"
        assert articles[1].url == "https://n.news.naver.com/2"

    @patch("src.crawlers.naver_news.NAVER_CLIENT_ID", "")
    @patch("src.crawlers.naver_news.NAVER_CLIENT_SECRET", "")
    def test_crawl_returns_empty_without_api_keys(self):
        crawler = NaverNewsCrawler()
        assert crawler.crawl() == []

    @patch("src.crawlers.naver_news.NAVER_CLIENT_ID", "test_id")
    @patch("src.crawlers.naver_news.NAVER_CLIENT_SECRET", "test_secret")
    def test_crawl_deduplicates_urls(self):
        crawler = NaverNewsCrawler()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "items": [
                {
                    "title": "중복 기사",
                    "originallink": "https://example.com/same",
                    "link": "",
                    "pubDate": "Mon, 10 Feb 2026 09:00:00 +0900",
                },
                {
                    "title": "중복 기사 2",
                    "originallink": "https://example.com/same",
                    "link": "",
                    "pubDate": "Mon, 10 Feb 2026 10:00:00 +0900",
                },
            ]
        }
        crawler.fetch = MagicMock(return_value=mock_resp)
        articles = crawler.crawl()

        urls = [a.url for a in articles]
        assert urls.count("https://example.com/same") == 1


class TestArticle:
    def test_date_obj_valid(self):
        a = Article(title="t", url="u", source="s", date="2026-02-10")
        assert a.date_obj is not None
        assert a.date_obj.year == 2026

    def test_date_obj_invalid(self):
        a = Article(title="t", url="u", source="s", date="invalid")
        assert a.date_obj is None

    def test_to_dict(self):
        a = Article(title="t", url="u", source="s", date="2026-01-01", category="c")
        d = a.to_dict()
        assert d["title"] == "t"
        assert d["category"] == "c"

    def test_d_day(self):
        from datetime import datetime, timedelta
        future = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        a = Article(title="t", url="u", source="s", date="2026-01-01", deadline=future)
        assert a.d_day == 5

    def test_d_day_none_without_deadline(self):
        a = Article(title="t", url="u", source="s", date="2026-01-01")
        assert a.d_day is None
