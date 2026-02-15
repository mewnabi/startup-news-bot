import { extractDate } from '@/lib/utils';
import { BaseCrawler } from './base';
import type { CheerioAPI, AnyNode, Cheerio } from './base';
import type { RawArticle } from './types';

const BASE_URL = 'https://www.mss.go.kr';
const LIST_URL = `${BASE_URL}/site/smba/ex/bbs/List.do`;
const BOARD_ID = '86';

export class MSSCrawler extends BaseCrawler {
  name = '중소벤처기업부';

  async crawl(): Promise<RawArticle[]> {
    const html = await this.fetch(`${LIST_URL}?cbIdx=${BOARD_ID}&pageIndex=1`);
    if (!html) return [];

    const $ = this.parse(html);
    const articles: RawArticle[] = [];

    const rows = this.findRows($);
    for (const row of rows) {
      const article = this.parseRow($, row);
      if (article) articles.push(article);
    }

    console.log(`[${this.name}] ${articles.length}건 수집 완료`);
    return articles;
  }

  private findRows($: CheerioAPI): AnyNode[] {
    const selectors = [
      'table.boardList tbody tr',
      'table.bbs_list tbody tr',
      'div.board_list table tbody tr',
      'table.tbl_type tbody tr',
      'table tbody tr',
    ];
    for (const sel of selectors) {
      const rows = $(sel).toArray();
      if (rows.length > 0) return rows;
    }
    return [];
  }

  private parseRow($: CheerioAPI, row: AnyNode): RawArticle | null {
    const $row = $(row);
    const cols = $row.find('td');
    if (cols.length < 3) return null;

    const link = $row.find('a').first();
    if (!link.length) return null;

    const title = link.text().trim();
    if (!title) return null;

    const url = this.extractUrl(link);
    const date = this.extractDateFromCols($, cols);

    return { title, url, source: this.name, date, deadline: '' };
  }

  private extractUrl(link: Cheerio<AnyNode>): string {
    const href = link.attr('href') ?? '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('/')) return BASE_URL + href;

    const onclick = link.attr('onclick') ?? '';
    if (onclick) {
      const match = onclick.match(/'(\d+)'\s*,\s*'(\d+)'/);
      if (match) {
        return `${BASE_URL}/site/smba/ex/bbs/View.do?cbIdx=${match[1]}&bcIdx=${match[2]}`;
      }
      const idMatch = onclick.match(/(\d{4,})/);
      if (idMatch) {
        return `${BASE_URL}/site/smba/ex/bbs/View.do?cbIdx=${BOARD_ID}&bcIdx=${idMatch[1]}`;
      }
    }

    return LIST_URL;
  }

  private extractDateFromCols($: CheerioAPI, cols: Cheerio<AnyNode>): string {
    for (let i = 0; i < cols.length; i++) {
      const text = $(cols[i]).text().trim();
      const match = text.match(/^(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})$/);
      if (match) {
        const [, y, m, d] = match;
        try {
          const dt = new Date(Number(y), Number(m) - 1, Number(d));
          if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
        } catch { /* skip */ }
      }
    }
    return extractDate('');
  }
}
