import { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, SEARCH_KEYWORDS } from '@/lib/config';
import { stripHtml, parseRfc2822Date } from '@/lib/utils';
import { BaseCrawler } from './base';
import type { RawArticle } from './types';

const API_URL = 'https://openapi.naver.com/v1/search/news.json';

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  pubDate: string;
}

interface NaverNewsResponse {
  items: NaverNewsItem[];
}

export class NaverNewsCrawler extends BaseCrawler {
  name = '네이버뉴스';

  async crawl(): Promise<RawArticle[]> {
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      console.warn(`[${this.name}] API 키가 설정되지 않았습니다.`);
      return [];
    }

    const articles: RawArticle[] = [];
    const seenUrls = new Set<string>();

    for (const keyword of SEARCH_KEYWORDS) {
      const params = new URLSearchParams({
        query: keyword,
        display: '10',
        start: '1',
        sort: 'date',
      });

      const data = await this.fetchJson<NaverNewsResponse>(
        `${API_URL}?${params}`,
        {
          headers: {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
          },
        }
      );

      if (!data) continue;

      for (const item of data.items ?? []) {
        const url = item.originallink || item.link;
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        articles.push({
          title: stripHtml(item.title),
          url,
          source: this.name,
          date: parseRfc2822Date(item.pubDate),
          deadline: '',
        });
      }
    }

    console.log(`[${this.name}] ${articles.length}건 수집 완료`);
    return articles;
  }
}
