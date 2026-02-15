import os
from dotenv import load_dotenv

load_dotenv()

# Slack
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")

# 네이버 검색 API
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")

# 크롤링 설정
REQUEST_TIMEOUT = 15  # seconds
REQUEST_DELAY = 1.0  # seconds between requests
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

# 필터링
DAYS_LOOKBACK = 7  # 최근 N일 이내 게시물만 수집

# 검색 키워드
SEARCH_KEYWORDS = [
    "창업 지원사업",
    "스타트업 정책",
    "정부 창업 지원",
]

# 전송 이력 파일
HISTORY_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "sent_history.json")
