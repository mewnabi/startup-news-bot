import * as cheerio from 'cheerio';
import type { CheerioAPI, Cheerio } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { REQUEST_TIMEOUT, USER_AGENT } from '@/lib/config';
import type { RawArticle } from './types';

export type { CheerioAPI, Cheerio, AnyNode };

/** 크롤러 베이스 클래스 */
export abstract class BaseCrawler {
  abstract name: string;

  /** URL을 요청하고 HTML 텍스트를 반환. 실패 시 null. */
  protected async fetch(url: string, options?: RequestInit): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const resp = await globalThis.fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        console.warn(`[${this.name}] HTTP ${resp.status}: ${url}`);
        return null;
      }

      return await resp.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[${this.name}] 요청 실패: ${url} — ${msg}`);
      return null;
    }
  }

  /** URL을 요청하고 JSON을 반환. 실패 시 null. */
  protected async fetchJson<T = unknown>(url: string, options?: RequestInit): Promise<T | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const resp = await globalThis.fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        console.warn(`[${this.name}] HTTP ${resp.status}: ${url}`);
        return null;
      }

      return (await resp.json()) as T;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[${this.name}] JSON 요청 실패: ${url} — ${msg}`);
      return null;
    }
  }

  /** HTML을 파싱하여 Cheerio 객체 반환 */
  protected parse(html: string): CheerioAPI {
    return cheerio.load(html);
  }

  /** 기사를 크롤링하여 반환 */
  abstract crawl(): Promise<RawArticle[]>;
}
