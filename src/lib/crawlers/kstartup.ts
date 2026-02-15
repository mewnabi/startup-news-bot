import { BaseCrawler } from './base';
import type { CheerioAPI, AnyNode, Cheerio } from './base';
import type { RawArticle } from './types';

const BASE_URL = 'https://www.k-startup.go.kr';
const LIST_URL = `${BASE_URL}/web/contents/bizpbanc-ongoing.do`;

export class KStartupCrawler extends BaseCrawler {
  name = 'K-Startup';

  async crawl(): Promise<RawArticle[]> {
    const html = await this.fetch(LIST_URL);
    if (!html) return [];

    const $ = this.parse(html);
    const articles: RawArticle[] = [];

    const container = $('#bizPbancList');
    if (!container.length) {
      console.warn(`[${this.name}] #bizPbancList 컨테이너를 찾을 수 없습니다.`);
      return [];
    }

    const items = container.find('ul > li').toArray();
    for (const item of items) {
      const article = this.parseItem($, item);
      if (article) articles.push(article);
    }

    console.log(`[${this.name}] ${articles.length}건 수집 완료`);
    return articles;
  }

  private parseItem($: CheerioAPI, item: AnyNode): RawArticle | null {
    const $item = $(item);

    const title = $item.find('p.tit').text().trim();
    if (!title) return null;

    let url = LIST_URL;
    const link = $item.find('div.middle a');
    if (link.length) {
      const href = link.attr('href') ?? '';
      const match = href.match(/go_view\((\d+)\)/);
      if (match) {
        url = `${LIST_URL}?schM=view&pbancSn=${match[1]}`;
      }
    }

    const { date, deadline } = this.extractDates($, $item);

    return { title, url, source: this.name, date, deadline };
  }

  private extractDates($: CheerioAPI, $item: Cheerio<AnyNode>): { date: string; deadline: string } {
    let date = '';
    let deadline = '';

    const spans = $item.find('div.bottom span.list').toArray();
    for (const span of spans) {
      const text = $(span).text().trim();
      const match = text.match(/(\d{4}-\d{2}-\d{2})/);
      if (!match) continue;

      if (text.includes('등록일자')) {
        date = match[1];
      } else if (text.includes('마감일자')) {
        deadline = match[1];
      }
    }

    if (!date) {
      date = new Date().toISOString().slice(0, 10);
    }

    return { date, deadline };
  }
}
