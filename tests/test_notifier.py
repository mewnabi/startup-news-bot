"""Slack 노티파이어 단위 테스트."""

from unittest.mock import MagicMock, patch

from src.crawlers.base import Article
from src.notifier import _build_message, send_slack


def _sample_data() -> dict[str, list[Article]]:
    return {
        "📋 지원사업 공고": [
            Article(
                title="예비창업패키지 모집",
                url="https://example.com/1",
                source="K-Startup",
                date="2026-02-10",
                category="📋 지원사업 공고",
            ),
        ],
        "📰 정책 뉴스": [
            Article(
                title="중기부 정책 발표",
                url="https://example.com/2",
                source="네이버뉴스",
                date="2026-02-11",
                category="📰 정책 뉴스",
            ),
        ],
    }


class TestBuildMessage:
    def test_contains_title(self):
        msg = _build_message(_sample_data())
        assert "창업 정책 위클리 다이제스트" in msg

    def test_contains_articles(self):
        msg = _build_message(_sample_data())
        assert "예비창업패키지 모집" in msg
        assert "중기부 정책 발표" in msg

    def test_contains_count(self):
        msg = _build_message(_sample_data())
        assert "2건" in msg

    def test_contains_source(self):
        msg = _build_message(_sample_data())
        assert "K-Startup" in msg

    def test_empty_data(self):
        msg = _build_message({})
        assert "0건" in msg


class TestSendSlack:
    @patch("src.notifier.SLACK_WEBHOOK_URL", "")
    def test_fails_without_webhook_url(self):
        assert send_slack(_sample_data()) is False

    @patch("src.notifier.SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    @patch("src.notifier.requests.post")
    def test_sends_successfully(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200)
        mock_post.return_value.raise_for_status = MagicMock()
        assert send_slack(_sample_data()) is True
        mock_post.assert_called_once()

    def test_empty_data_returns_true(self):
        assert send_slack({}) is True
