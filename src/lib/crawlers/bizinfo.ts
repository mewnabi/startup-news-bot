import { extractDate } from '@/lib/utils';
import { BaseCrawler } from './base';
import type { CheerioAPI, AnyNode, Cheerio } from './base';
import type { RawArticle } from './types';

const BASE_URL = 'https://www.bizinfo.go.kr';
const LIST_URL = `${BASE_URL}/web/lay1/bbs/S1T122C128/AS/74/list.do`;

export class BizinfoCrawler extends BaseCrawler {
  name = '기업마당';

  async crawl(): Promise<RawArticle[]> {
    const html = await this.fetch(LIST_URL);
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
      'table.tbl_type1 tbody tr',
      'table.boardList tbody tr',
      'table.bbs_list tbody tr',
      'div.board_list table tbody tr',
      'div.tbl_wrap table tbody tr',
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
    if (cols.length < 2) return null;

    const link = $row.find('a').first();
    if (!link.length) return null;

    const title = link.text().trim();
    if (!title) return null;

    const url = this.extractUrl(link);
    const date = extractDate($row.text());

    return { title, url, source: this.name, date, deadline: '' };
  }

  private extractUrl(link: Cheerio<AnyNode>): string {
    const href = link.attr('href') ?? '';
    if (href.startsWith('http')) return href;
    if (href.startsWith('/')) return BASE_URL + href;

    const onclick = link.attr('onclick') ?? '';
    if (onclick) {
      const pblancMatch = onclick.match(/PBLN_\w+/);
      if (pblancMatch) {
        return `${BASE_URL}/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=${pblancMatch[0]}`;
      }
      const pathMatch = onclick.match(/'(\/[^']+)'/);
      if (pathMatch) {
        return BASE_URL + pathMatch[1];
      }
    }

    return LIST_URL;
  }
}
