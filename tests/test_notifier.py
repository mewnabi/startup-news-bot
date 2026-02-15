"""Slack 노티파이어 단위 테스트."""

from unittest.mock import MagicMock, patch

from src.crawlers.base import Article
from src.notifier import _build_main_message, _build_thread_message, send_slack
from src.processor import CAT_NEWS, CAT_NEW, CAT_URGENT


def _sample_data() -> dict[str, list[Article]]:
    return {
        CAT_URGENT: [
            Article(
                title="마감 임박 공고",
                url="https://example.com/1",
                source="K-Startup",
                date="2026-02-10",
                deadline="2026-02-18",
                category=CAT_URGENT,
            ),
        ],
        CAT_NEW: [
            Article(
                title="신규 공고",
                url="https://example.com/2",
                source="기업마당",
                date="2026-02-13",
                deadline="2026-06-30",
                category=CAT_NEW,
            ),
        ],
        CAT_NEWS: [
            Article(
                title="중기부 정책 발표",
                url="https://example.com/3",
                source="네이버뉴스",
                date="2026-02-11",
                category=CAT_NEWS,
            ),
        ],
    }


class TestBuildMainMessage:
    def test_contains_title(self):
        msg = _build_main_message(_sample_data())
        assert "창업 정책 위클리 다이제스트" in msg

    def test_contains_categories(self):
        msg = _build_main_message(_sample_data())
        assert "마감 임박" in msg
        assert "신규 공고" in msg
        assert "정책 동향" in msg

    def test_contains_articles(self):
        msg = _build_main_message(_sample_data())
        assert "마감 임박 공고" in msg
        assert "중기부 정책 발표" in msg

    def test_shows_overflow(self):
        # 12건의 신규 공고 (제한 10건)
        data = {
            CAT_NEW: [
                Article(
                    title=f"공고 {i}",
                    url=f"https://example.com/{i}",
                    source="K-Startup",
                    date="2026-02-10",
                    category=CAT_NEW,
                )
                for i in range(12)
            ]
        }
        msg = _build_main_message(data)
        assert "외 2건" in msg


class TestBuildThreadMessage:
    def test_contains_all_articles(self):
        msg = _build_thread_message(_sample_data())
        assert "전체 목록" in msg
        assert "마감 임박 공고" in msg
        assert "신규 공고" in msg
        assert "중기부 정책 발표" in msg


class TestSendSlack:
    def test_empty_data_returns_true(self):
        assert send_slack({}) is True

    @patch("src.notifier.SLACK_BOT_TOKEN", "xoxb-test")
    @patch("src.notifier.SLACK_CHANNEL_ID", "C123")
    @patch("src.notifier.WebClient")
    def test_bot_sends_main_and_thread(self, MockClient):
        mock_client = MagicMock()
        mock_client.chat_postMessage.return_value = {"ts": "1234.5678"}
        MockClient.return_value = mock_client

        assert send_slack(_sample_data()) is True
        assert mock_client.chat_postMessage.call_count == 2  # 메인 + 스레드

    @patch("src.notifier.SLACK_BOT_TOKEN", "")
    @patch("src.notifier.SLACK_CHANNEL_ID", "")
    @patch("src.notifier.SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
    @patch("src.notifier.requests.post")
    def test_webhook_fallback(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200)
        mock_post.return_value.raise_for_status = MagicMock()
        assert send_slack(_sample_data()) is True
        mock_post.assert_called_once()

    @patch("src.notifier.SLACK_BOT_TOKEN", "")
    @patch("src.notifier.SLACK_CHANNEL_ID", "")
    @patch("src.notifier.SLACK_WEBHOOK_URL", "")
    def test_no_config_fails(self):
        assert send_slack(_sample_data()) is False
