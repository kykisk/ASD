import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface ArticleDetail {
  pubmedId: string;
  title: string;
  abstract: string;
  authors: string[];
  publishedAt: string;
  journal: string;
}

@Injectable()
export class PubmedService {
  private readonly logger = new Logger(PubmedService.name);

  async searchArticles(query: string, maxResults = 10): Promise<{ ids: string[] }> {
    const url = `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=date`;

    const response = await axios.get(url, { timeout: 15000 });
    const idList = response.data?.esearchresult?.idlist ?? [];

    return { ids: idList };
  }

  async fetchArticleDetails(ids: string[]): Promise<ArticleDetail[]> {
    if (ids.length === 0) return [];

    const url = `${BASE}/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    const response = await axios.get(url, { timeout: 30000, responseType: 'text' });
    const xml = response.data as string;

    return this.parseArticlesXml(xml);
  }

  private parseArticlesXml(xml: string): ArticleDetail[] {
    const articles: ArticleDetail[] = [];
    const articleBlocks = xml.split('<PubmedArticle>').slice(1);

    for (const block of articleBlocks) {
      const pubmedId = this.extractTag(block, 'PMID') ?? '';
      const title = this.extractTag(block, 'ArticleTitle') ?? '';
      const abstract = this.extractTag(block, 'AbstractText') ?? '';
      const journal = this.extractBetween(block, '<Title>', '</Title>') ?? '';

      const authors: string[] = [];
      const authorMatches = block.match(/<Author[^>]*>[\s\S]*?<\/Author>/g) ?? [];
      for (const authorBlock of authorMatches) {
        const lastName = this.extractTag(authorBlock, 'LastName') ?? '';
        const foreName = this.extractTag(authorBlock, 'ForeName') ?? '';
        if (lastName) {
          authors.push(foreName ? `${foreName} ${lastName}` : lastName);
        }
      }

      let publishedAt = new Date().toISOString();
      const yearMatch = block.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
      const monthMatch = block.match(/<PubDate>[\s\S]*?<Month>(\w+)<\/Month>/);
      if (yearMatch) {
        const year = yearMatch[1];
        const month = monthMatch ? this.parseMonth(monthMatch[1]) : '01';
        publishedAt = `${year}-${month}-01T00:00:00.000Z`;
      }

      if (pubmedId) {
        articles.push({ pubmedId, title, abstract, authors, publishedAt, journal });
      }
    }

    return articles;
  }

  private extractTag(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractBetween(xml: string, start: string, end: string): string | null {
    const startIdx = xml.indexOf(start);
    if (startIdx === -1) return null;
    const endIdx = xml.indexOf(end, startIdx + start.length);
    if (endIdx === -1) return null;
    return xml.substring(startIdx + start.length, endIdx).trim();
  }

  private parseMonth(month: string): string {
    const months: Record<string, string> = {
      Jan: '01',
      Feb: '02',
      Mar: '03',
      Apr: '04',
      May: '05',
      Jun: '06',
      Jul: '07',
      Aug: '08',
      Sep: '09',
      Oct: '10',
      Nov: '11',
      Dec: '12',
    };
    return months[month] ?? '01';
  }
}
