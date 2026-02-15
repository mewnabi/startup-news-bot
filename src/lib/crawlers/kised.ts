import { BaseCrawler } from './base';
import type { CheerioAPI, AnyNode, Cheerio } from './base';
import type { RawArticle } from './types';

const BASE_URL = 'https://www.kised.or.kr';
const LIST_URL = `${BASE_URL}/menu.es?mid=a10302000000`;

export class KisedCrawler extends BaseCrawler {
  name = '창업진흥원';

  async crawl(): Promise<RawArticle[]> {
    const html = await this.fetch(LIST_URL);
    if (!html) return [];

    const $ = this.parse(html);
    const articles: RawArticle[] = [];

    const items = $('ul.lstyle_list > li').toArray();
    if (items.length === 0) {
      console.warn(`[${this.name}] ul.lstyle_list를 찾을 수 없습니다.`);
      return [];
    }

    for (const item of items) {
      const article = this.parseItem($, item);
      if (article) articles.push(article);
    }

    console.log(`[${this.name}] ${articles.length}건 수집 완료`);
    return articles;
  }

  private parseItem($: CheerioAPI, item: AnyNode): RawArticle | null {
    const $item = $(item);

    const title = $item.find('b.ls_tit').text().trim();
    if (!title) return null;

    let url = LIST_URL;
    const link = $item.find('a[href]').first();
    if (link.length) {
      const href = link.attr('href') ?? '';
      if (href.startsWith('http')) {
        url = href;
      } else if (href.startsWith('/')) {
        url = BASE_URL + href;
      }
    }

    const deadline = this.extractDeadline($, $item);
    const date = new Date().toISOString().slice(0, 10);

    return { title, url, source: this.name, date, deadline };
  }

  private extractDeadline($: CheerioAPI, $item: Cheerio<AnyNode>): string {
    const dts = $item.find('dl dt').toArray();
    const dds = $item.find('dl dd').toArray();

    for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
      const dtText = $(dts[i]).text();
      if (dtText.includes('마감')) {
        const ddText = $(dds[i]).text().trim();
        const match = ddText.match(/(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
      }
    }

    for (const dd of dds) {
      const text = $(dd).text().trim();
      const match = text.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }

    return '';
  }
}
