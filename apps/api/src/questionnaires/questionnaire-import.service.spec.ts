import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireImportService } from './questionnaire-import.service';
import { QuestionnairesService } from './questionnaires.service';
import * as XLSX from 'xlsx';

const mockQuestionnairesService = {
  create: vi.fn().mockResolvedValue({
    id: 'q-1',
    name: 'Test Questionnaire',
    items: [],
  }),
};

function buildCSV(rows: string[]): Buffer {
  const header = 'domain,text,description,weight';
  return Buffer.from([header, ...rows].join('\n'), 'utf-8');
}

function buildExcelBuffer(rows: Record<string, unknown>[]): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}

describe('QuestionnaireImportService', () => {
  let service: QuestionnaireImportService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionnaireImportService,
        { provide: QuestionnairesService, useValue: mockQuestionnairesService },
      ],
    }).compile();

    service = module.get<QuestionnaireImportService>(QuestionnaireImportService);
    Object.defineProperty(service, 'questionnairesService', { value: mockQuestionnairesService });
  });

  describe('parseCSV', () => {
    it('should parse valid CSV correctly', () => {
      const csv = buildCSV([
        'COMMUNICATION,오늘 말로 요구를 표현했나요?,언어적 요청 능력,1.0',
        'SOCIAL,또래와 눈 맞춤이 있었나요?,시선 접촉,1.5',
      ]);

      const result = service.parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.items[0]).toEqual({
        domain: 'COMMUNICATION',
        text: '오늘 말로 요구를 표현했나요?',
        description: '언어적 요청 능력',
        weight: 1.0,
        orderIndex: 0,
      });
      expect(result.items[1]).toEqual({
        domain: 'SOCIAL',
        text: '또래와 눈 맞춤이 있었나요?',
        description: '시선 접촉',
        weight: 1.5,
        orderIndex: 1,
      });
    });

    it('should collect error for invalid domain and still parse valid rows', () => {
      const csv = buildCSV([
        'INVALID_DOMAIN,some text,,1.0',
        'SOCIAL,valid text,,1.0',
      ]);

      const result = service.parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].domain).toBe('SOCIAL');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid domain');
      expect(result.errors[0]).toContain('INVALID_DOMAIN');
    });

    it('should skip completely empty rows silently', () => {
      const content = 'domain,text,description,weight\nCOMMUNICATION,hello,,1.0\n,,,\nSOCIAL,world,,1.0';
      const csv = Buffer.from(content, 'utf-8');

      const result = service.parseCSV(csv);

      expect(result.items).toHaveLength(2);
      expect(result.skippedRows).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should error when required text field is missing', () => {
      const csv = buildCSV(['COMMUNICATION,,,1.0']);

      const result = service.parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.items).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('text');
      expect(result.errors[0]).toContain('required');
    });
  });

  describe('parseExcel', () => {
    it('should parse valid Excel correctly', () => {
      const buffer = buildExcelBuffer([
        { domain: 'COMMUNICATION', text: '말로 요구를 표현했나요?', description: '언어적', weight: 1.0 },
        { domain: 'MOTOR', text: '소근육 운동 가능?', description: '', weight: 2.0 },
      ]);

      const result = service.parseExcel(buffer);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].domain).toBe('COMMUNICATION');
      expect(result.items[1].domain).toBe('MOTOR');
      expect(result.items[1].weight).toBe(2.0);
    });
  });

  describe('parseRows (via parseCSV)', () => {
    it('should default weight to 1.0 when missing', () => {
      const csv = buildCSV(['COMMUNICATION,some text,,']);

      const result = service.parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items[0].weight).toBe(1.0);
    });

    it('should error when weight is out of range', () => {
      const csv = buildCSV(['COMMUNICATION,some text,,6.0']);

      const result = service.parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('weight');
      expect(result.errors[0]).toContain('between 0.1 and 5.0');
    });

    it('should error when weight is below minimum', () => {
      const csv = buildCSV(['COMMUNICATION,some text,,0.05']);

      const result = service.parseCSV(csv);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('weight');
    });

    it('should handle case-insensitive domain', () => {
      const csv = buildCSV(['communication,some text,,1.0']);

      const result = service.parseCSV(csv);

      expect(result.success).toBe(true);
      expect(result.items[0].domain).toBe('COMMUNICATION');
    });
  });

  describe('importFromCSV', () => {
    it('should call QuestionnairesService.create with parsed items', async () => {
      const csv = buildCSV([
        'COMMUNICATION,hello,,1.0',
        'SOCIAL,world,,2.0',
      ]);

      const result = await service.importFromCSV('family-1', 'user-1', 'Test', csv);

      expect(mockQuestionnairesService.create).toHaveBeenCalledWith(
        'family-1',
        'user-1',
        expect.objectContaining({
          name: 'Test',
          domains: ['COMMUNICATION', 'SOCIAL'],
          items: expect.arrayContaining([
            expect.objectContaining({ domain: 'COMMUNICATION', text: 'hello' }),
            expect.objectContaining({ domain: 'SOCIAL', text: 'world' }),
          ]),
        }),
      );
      expect(result.questionnaire).toBeDefined();
      expect(result.parseResult.success).toBe(true);
    });

    it('should return null questionnaire when no valid items', async () => {
      const csv = buildCSV(['INVALID,,,']);

      const result = await service.importFromCSV('family-1', 'user-1', 'Test', csv);

      expect(result.questionnaire).toBeNull();
      expect(mockQuestionnairesService.create).not.toHaveBeenCalled();
    });
  });
});
