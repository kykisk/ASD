import { Injectable } from '@nestjs/common';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { QuestionnairesService } from './questionnaires.service.js';

const VALID_DOMAINS = [
  'COMMUNICATION',
  'SOCIAL',
  'MOTOR',
  'COGNITIVE',
  'EMOTIONAL',
  'DAILY_LIVING',
  'OTHER',
] as const;

export interface ParsedItem {
  domain: string;
  text: string;
  description?: string;
  weight: number;
  orderIndex: number;
}

export interface ParseResult {
  success: boolean;
  items: ParsedItem[];
  errors: string[];
  skippedRows: number;
}

@Injectable()
export class QuestionnaireImportService {
  constructor(private questionnairesService: QuestionnairesService) {}

  parseCSV(fileBuffer: Buffer): ParseResult {
    const content = fileBuffer.toString('utf-8');
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    });

    return this.parseRows(parsed.data);
  }

  parseExcel(fileBuffer: Buffer): ParseResult {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: '',
    });

    return this.parseRows(rows);
  }

  private parseRows(rows: Record<string, string>[]): ParseResult {
    const items: ParsedItem[] = [];
    const errors: string[] = [];
    let skippedRows = 0;
    let orderIndex = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;

      const values = Object.values(row);
      if (values.every((v) => v === '' || v === null || v === undefined)) {
        skippedRows++;
        continue;
      }

      const result = this.validateRow(row, rowIndex);
      if (result.valid && result.item) {
        items.push({ ...result.item, orderIndex });
        orderIndex++;
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    return {
      success: errors.length === 0 && items.length > 0,
      items,
      errors,
      skippedRows,
    };
  }

  private validateRow(
    row: Record<string, string>,
    rowIndex: number,
  ): { valid: boolean; item?: ParsedItem; error?: string } {
    const domain = String(row['domain'] ?? '').trim().toUpperCase();
    const text = String(row['text'] ?? '').trim();
    const description = String(row['description'] ?? '').trim() || undefined;
    const rawWeight = row['weight'] ?? '';
    const weightStr = String(rawWeight).trim();

    if (!VALID_DOMAINS.includes(domain as (typeof VALID_DOMAINS)[number])) {
      return {
        valid: false,
        error: `Row ${rowIndex}: Invalid domain "${row['domain'] ?? ''}". Must be one of: ${VALID_DOMAINS.join(', ')}`,
      };
    }

    if (!text) {
      return {
        valid: false,
        error: `Row ${rowIndex}: "text" field is required and cannot be empty`,
      };
    }
    if (text.length > 500) {
      return {
        valid: false,
        error: `Row ${rowIndex}: "text" exceeds maximum length of 500 characters`,
      };
    }

    let weight = 1.0;
    if (weightStr) {
      weight = parseFloat(weightStr);
      if (isNaN(weight)) {
        return {
          valid: false,
          error: `Row ${rowIndex}: "weight" must be a number, got "${weightStr}"`,
        };
      }
      if (weight < 0.1 || weight > 5.0) {
        return {
          valid: false,
          error: `Row ${rowIndex}: "weight" must be between 0.1 and 5.0, got ${weight}`,
        };
      }
    }

    return {
      valid: true,
      item: {
        domain,
        text,
        description,
        weight,
        orderIndex: 0,
      },
    };
  }

  async importFromCSV(
    familyId: string,
    userId: string,
    name: string,
    fileBuffer: Buffer,
  ) {
    const parseResult = this.parseCSV(fileBuffer);
    return this.createFromParseResult(familyId, userId, name, parseResult);
  }

  async importFromExcel(
    familyId: string,
    userId: string,
    name: string,
    fileBuffer: Buffer,
  ) {
    const parseResult = this.parseExcel(fileBuffer);
    return this.createFromParseResult(familyId, userId, name, parseResult);
  }

  private async createFromParseResult(
    familyId: string,
    userId: string,
    name: string,
    parseResult: ParseResult,
  ) {
    if (parseResult.items.length === 0) {
      return {
        questionnaire: null,
        parseResult,
      };
    }

    const domains = [...new Set(parseResult.items.map((item) => item.domain))];

    const questionnaire = await this.questionnairesService.create(
      familyId,
      userId,
      {
        name,
        domains,
        items: parseResult.items.map((item) => ({
          domain: item.domain,
          text: item.text,
          description: item.description,
          orderIndex: item.orderIndex,
          weight: item.weight,
        })),
      },
    );

    return {
      questionnaire,
      parseResult,
    };
  }
}
