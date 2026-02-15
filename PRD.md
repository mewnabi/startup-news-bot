# PRD: 창업 정책 뉴스 자동 수집 & Slack 알림 봇

## 1. 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | Startup Policy Digest (스타트업 정책 다이제스트) |
| **목적** | 창업 관련 정부 정책, 지원 사업 소식을 자동 수집하여 매주 Slack으로 전달 |
| **대상 사용자** | 창업자, 스타트업 팀, 정책 관심자 |
| **실행 주기** | 매주 월요일 오전 9시 (KST) |
| **기술 스택** | Python, GitHub Actions |
| **알림 채널** | Slack (Incoming Webhook) |

---

## 2. 핵심 기능

### 2.1 정보 수집 (Crawler)

**공식 사이트 크롤링:**

| 출처 | URL | 수집 대상 |
|------|-----|-----------|
| K-Startup | https://www.k-startup.go.kr | 공지사항, 지원사업 공고 |
| 중소벤처기업부 | https://www.mss.go.kr | 정책 뉴스, 보도자료 |
| 창업진흥원 | https://www.kised.or.kr | 사업공고, 주요소식 |
| 기업마당 | https://www.bizinfo.go.kr | 지원사업 통합검색 |

**뉴스 검색:**

| 출처 | 방식 | 키워드 |
|------|------|--------|
| 네이버 뉴스 | 검색 API | "창업 지원", "스타트업 정책", "정부 지원사업" |

### 2.2 데이터 처리 (Processor)

```
수집 → 중복 제거 → 필터링 → 요약 → 포맷팅
```

- **중복 제거**: URL 기반 중복 판별 (이전 전송 이력과 비교)
- **필터링**: 최근 7일 이내 게시물만 포함
- **카테고리 분류**:
  - 📋 지원사업 공고
  - 📰 정책 뉴스/보도자료
  - 💰 투자/자금 지원
  - 🎓 교육/멘토링
- **요약**: 제목 + 출처 + 날짜 + 링크 형태로 정리

### 2.3 Slack 전송 (Notifier)

**메시지 포맷 예시:**

```
📮 [창업 정책 위클리 다이제스트] 2026.02.16

━━━━━━━━━━━━━━━━━━━━━━━

📋 지원사업 공고 (3건)
• 2026년 예비창업패키지 모집 공고
  └ K-Startup | 2026.02.12 | 링크
• 초기창업패키지 2차 모집
  └ 창업진흥원 | 2026.02.13 | 링크
• 창업도약패키지 통합 공고
  └ 중소벤처기업부 | 2026.02.14 | 링크

📰 정책 뉴스 (2건)
• 중기부, 2026년 창업지원 예산 1.5조 편성
  └ 네이버뉴스 | 2026.02.11 | 링크
• 스타트업 규제특례 확대 시행
  └ 네이버뉴스 | 2026.02.10 | 링크

━━━━━━━━━━━━━━━━━━━━━━━
총 5건 | 자동 수집 by Startup Policy Digest
```

---

## 3. 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│                GitHub Actions                    │
│         (cron: 매주 월요일 09:00 KST)            │
│                                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │ Crawler  │──▶│Processor │──▶│   Notifier   │ │
│  │          │   │          │   │  (Slack API)  │ │
│  └──────────┘   └──────────┘   └──────────────┘ │
│       │              │                           │
│       ▼              ▼                           │
│  ┌─────────────────────┐                         │
│  │   sent_history.json │                         │
│  │   (GitHub Artifact) │                         │
│  └─────────────────────┘                         │
└─────────────────────────────────────────────────┘
```

---

## 4. 프로젝트 구조

```
startup-news-bot/
├── .github/
│   └── workflows/
│       └── weekly-digest.yml      # GitHub Actions 워크플로우
├── src/
│   ├── __init__.py
│   ├── main.py                    # 진입점
│   ├── crawlers/
│   │   ├── __init__.py
│   │   ├── base.py                # 크롤러 베이스 클래스
│   │   ├── kstartup.py            # K-Startup 크롤러
│   │   ├── mss.py                 # 중소벤처기업부 크롤러
│   │   ├── kised.py               # 창업진흥원 크롤러
│   │   ├── bizinfo.py             # 기업마당 크롤러
│   │   └── naver_news.py          # 네이버 뉴스 검색
│   ├── processor.py               # 중복 제거, 필터링, 분류
│   ├── notifier.py                # Slack 메시지 전송
│   └── config.py                  # 설정 관리
├── data/
│   └── sent_history.json          # 전송 이력 (중복 방지)
├── tests/
│   ├── test_crawlers.py
│   ├── test_processor.py
│   └── test_notifier.py
├── requirements.txt
├── .env.example                   # 환경변수 템플릿
└── README.md
```

---

## 5. 기술 상세

### 5.1 주요 라이브러리

| 라이브러리 | 용도 | 비고 |
|-----------|------|------|
| `requests` | HTTP 요청 | 뉴스/사이트 크롤링 |
| `beautifulsoup4` | HTML 파싱 | 공식 사이트 크롤링 |
| `slack-sdk` | Slack 메시지 전송 | Incoming Webhook 활용 |
| `python-dotenv` | 환경변수 관리 | API 키, Webhook URL 등 |
| `pytest` | 테스트 | 단위 테스트 |

### 5.2 환경변수 (Secrets)

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | O |
| `NAVER_CLIENT_ID` | 네이버 검색 API Client ID | O |
| `NAVER_CLIENT_SECRET` | 네이버 검색 API Client Secret | O |

### 5.3 GitHub Actions 워크플로우

```yaml
name: Weekly Startup Policy Digest

on:
  schedule:
    - cron: '0 0 * * 1'  # UTC 00:00 월요일 = KST 09:00 월요일
  workflow_dispatch:       # 수동 실행 가능

jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: python -m src.main
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          NAVER_CLIENT_ID: ${{ secrets.NAVER_CLIENT_ID }}
          NAVER_CLIENT_SECRET: ${{ secrets.NAVER_CLIENT_SECRET }}
```

---

## 6. 사전 준비 사항

### 6.1 Slack 설정
1. Slack 워크스페이스에서 [Incoming Webhook 앱](https://api.slack.com/messaging/webhooks) 추가
2. 알림 받을 채널 선택 후 Webhook URL 복사
3. GitHub 리포지토리 Secrets에 `SLACK_WEBHOOK_URL` 등록

### 6.2 네이버 검색 API 설정
1. [네이버 개발자센터](https://developers.naver.com/) 접속
2. 애플리케이션 등록 → "검색" API 사용 신청
3. Client ID/Secret을 GitHub Secrets에 등록

### 6.3 GitHub 리포지토리
1. 새 리포지토리 생성
2. Secrets 등록 (Settings → Secrets and variables → Actions)
3. Actions 탭에서 워크플로우 활성화

---

## 7. 구현 단계 (마일스톤)

### Phase 1: MVP (1주차)
- [ ] 프로젝트 초기 설정 (Python, 의존성)
- [ ] 네이버 뉴스 검색 크롤러 구현
- [ ] K-Startup 공지사항 크롤러 구현
- [ ] Slack Webhook 전송 기능 구현
- [ ] GitHub Actions 워크플로우 설정
- [ ] 수동 실행으로 E2E 테스트

### Phase 2: 확장 (2주차)
- [ ] 중소벤처기업부 크롤러 추가
- [ ] 창업진흥원 크롤러 추가
- [ ] 기업마당 크롤러 추가
- [ ] 카테고리 자동 분류 로직
- [ ] 중복 제거 로직 (전송 이력 관리)

### Phase 3: 안정화 (3주차)
- [ ] 에러 핸들링 및 재시도 로직
- [ ] 크롤링 실패 시 알림 (Slack 에러 채널)
- [ ] 단위 테스트 작성
- [ ] README 문서화

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|-----------|
| 크롤링 대상 사이트 구조 변경 | 데이터 수집 실패 | 크롤러별 독립 실행, 실패 시 나머지는 정상 전송 |
| 네이버 API 호출 제한 (25,000건/일) | 검색 실패 | 일 1회 실행이므로 제한 초과 가능성 낮음 |
| GitHub Actions 무료 한도 (2,000분/월) | 실행 불가 | 월 4회 실행, 1회 약 1~2분이므로 충분 |
| 공공 사이트 접근 차단 | 크롤링 실패 | User-Agent 설정, 적절한 요청 간격 유지 |

---

## 9. 향후 확장 가능성 (Out of Scope)

- Telegram 채널 동시 발송 지원
- AI 요약 (Claude API 연동으로 기사 핵심 요약)
- 키워드 커스터마이징 (관심 분야별 필터)
- 웹 대시보드 (수집 이력 조회)
- 마감 임박 공고 별도 알림 (D-3, D-1)
