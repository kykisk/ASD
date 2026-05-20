import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../app/app.module.js';

describe('Critical Flows E2E', () => {
  let app: INestApplication;
  const testId = randomUUID().slice(0, 8);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerUser() {
    const email = `test+${randomUUID()}@test.com`;
    const password = 'TestPass123!@#';
    const name = `TestUser_${testId}`;

    const res = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password, name })
      .expect(201);

    const accessToken = res.body.data?.accessToken ?? res.body.accessToken;
    const refreshCookie = res.headers['set-cookie']?.find((c: string) =>
      c.includes('__auticare_rt'),
    );

    return { email, password, name, accessToken, refreshCookie, body: res.body };
  }

  async function createFamily(token: string) {
    const res = await request(app.getHttpServer())
      .post('/v1/families')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Test Family ${testId}` })
      .expect(201);

    const data = res.body.data ?? res.body;
    return { familyId: data.id };
  }

  async function createChild(token: string, familyId: string) {
    const res = await request(app.getHttpServer())
      .post(`/v1/families/${familyId}/children`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `TestChild_${testId}`,
        birthDate: '2021-06-15',
        gender: 'MALE',
      })
      .expect(201);

    const data = res.body.data ?? res.body;
    return { childId: data.id, child: data };
  }

  async function createQuestionnaire(token: string, familyId: string) {
    const res = await request(app.getHttpServer())
      .post(`/v1/v1/families/${familyId}/questionnaires`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `Test Questionnaire ${testId}`,
        domains: ['COMMUNICATION', 'SOCIAL'],
        items: [
          { question: 'Q1', domain: 'COMMUNICATION', order: 1, weight: 1 },
          { question: 'Q2', domain: 'SOCIAL', order: 2, weight: 1 },
        ],
      })
      .expect(201);

    const data = res.body.data ?? res.body;
    return { questionnaireId: data.id, questionnaire: data };
  }

  describe('Critical Flow 1: Auth Flow', () => {
    let accessToken: string;
    let refreshCookie: string | undefined;

    it('POST /v1/auth/register → 201 with accessToken', async () => {
      const result = await registerUser();
      accessToken = result.accessToken;
      refreshCookie = result.refreshCookie;

      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
    });

    it('GET /v1/users/me → 200 with user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data ?? res.body;
      expect(data.email).toBeDefined();
      expect(data.name).toBeDefined();
    });

    it('POST /v1/auth/refresh → 200 with new accessToken', async () => {
      const req = request(app.getHttpServer())
        .post('/v1/auth/refresh');

      if (refreshCookie) {
        req.set('Cookie', refreshCookie);
      }

      const res = await req.expect(200);
      const data = res.body.data ?? res.body;
      expect(data.accessToken).toBeDefined();
      accessToken = data.accessToken;
    });

    it('POST /v1/auth/logout → 200', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Critical Flow 2: Family + Child', () => {
    let accessToken: string;
    let familyId: string;
    let childId: string;

    it('should register and create family', async () => {
      const user = await registerUser();
      accessToken = user.accessToken;

      const family = await createFamily(accessToken);
      familyId = family.familyId;
      expect(familyId).toBeDefined();
    });

    it('POST /v1/families/:familyId/children → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/families/${familyId}/children`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Child_${testId}`,
          birthDate: '2021-06-15',
          gender: 'MALE',
        })
        .expect(201);

      const data = res.body.data ?? res.body;
      childId = data.id;
      expect(childId).toBeDefined();
    });

    it('GET /v1/families/:familyId/children → 200 with children list', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/families/${familyId}/children`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data ?? res.body;
      const children = Array.isArray(data) ? data : data.children ?? [];
      expect(children.length).toBeGreaterThan(0);

      const found = children.find((c: { id: string }) => c.id === childId);
      expect(found).toBeDefined();
      expect(found.name).toBeDefined();
    });

    it('PATCH /v1/children/:childId → 200 updated', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/v1/children/${childId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: `Updated_${testId}` })
        .expect(200);

      const data = res.body.data ?? res.body;
      expect(data.name).toContain('Updated');
    });
  });

  describe('Critical Flow 3: Schedule', () => {
    let accessToken: string;
    let familyId: string;
    let childId: string;

    beforeAll(async () => {
      const user = await registerUser();
      accessToken = user.accessToken;
      const family = await createFamily(accessToken);
      familyId = family.familyId;
      const child = await createChild(accessToken, familyId);
      childId = child.childId;
    });

    it('POST /v1/v1/children/:childId/schedules → 201', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(10, 0, 0, 0);

      const res = await request(app.getHttpServer())
        .post(`/v1/v1/children/${childId}/schedules`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: `Therapy_${testId}`,
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
          category: 'THERAPY',
        })
        .expect(201);

      const data = res.body.data ?? res.body;
      expect(data.id).toBeDefined();
      expect(data.title).toContain('Therapy');
    });

    it('GET /v1/v1/children/:childId/schedules → 200 with schedules', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const res = await request(app.getHttpServer())
        .get(`/v1/v1/children/${childId}/schedules`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .expect(200);

      const data = res.body.data ?? res.body;
      const schedules = Array.isArray(data) ? data : data.schedules ?? [];
      expect(schedules.length).toBeGreaterThan(0);
    });

    it('POST /v1/v1/schedules/check-conflicts → 200', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      tomorrow.setHours(9, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(10, 0, 0, 0);

      const res = await request(app.getHttpServer())
        .post('/v1/v1/schedules/check-conflicts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          childId,
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect([200, 409]).toContain(res.status);
    });
  });

  describe('Critical Flow 4: Assessment', () => {
    let accessToken: string;
    let familyId: string;
    let childId: string;
    let questionnaireId: string;

    beforeAll(async () => {
      const user = await registerUser();
      accessToken = user.accessToken;
      const family = await createFamily(accessToken);
      familyId = family.familyId;
      const child = await createChild(accessToken, familyId);
      childId = child.childId;
      const questionnaire = await createQuestionnaire(accessToken, familyId);
      questionnaireId = questionnaire.questionnaireId;
    });

    it('POST /v1/v1/children/:childId/assessments → 201', async () => {
      const res = await request(app.getHttpServer())
        .post(`/v1/v1/children/${childId}/assessments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          questionnaireId,
          scores: [
            { itemId: 'item-1', domain: 'COMMUNICATION', score: 4, notes: '' },
            { itemId: 'item-2', domain: 'SOCIAL', score: 3, notes: '' },
          ],
        })
        .expect(201);

      const data = res.body.data ?? res.body;
      expect(data.id).toBeDefined();
    });

    it('GET /v1/v1/children/:childId/assessments → 200 with assessments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/v1/children/${childId}/assessments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data ?? res.body;
      const assessments = Array.isArray(data) ? data : data.assessments ?? [];
      expect(assessments.length).toBeGreaterThan(0);
    });

    it('GET /v1/v1/children/:childId/assessments/aggregated → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/v1/children/${childId}/assessments/aggregated`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data ?? res.body;
      expect(data).toHaveProperty('domains');
    });
  });

  describe('Critical Flow 5: Dashboard', () => {
    let accessToken: string;
    let familyId: string;
    let childId: string;

    beforeAll(async () => {
      const user = await registerUser();
      accessToken = user.accessToken;
      const family = await createFamily(accessToken);
      familyId = family.familyId;
      const child = await createChild(accessToken, familyId);
      childId = child.childId;
    });

    it('GET /v1/v1/children/:childId/dashboard → 200 with dashboard data', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/v1/children/${childId}/dashboard`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data ?? res.body;
      expect(data).toHaveProperty('today');
      expect(data).toHaveProperty('weeklyProgress');
      expect(data).toHaveProperty('alerts');
    });

    it('GET /v1/v1/children/:childId/dashboard → 200 (cache hit)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/v1/v1/children/${childId}/dashboard`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const data = res.body.data ?? res.body;
      expect(data).toHaveProperty('today');
    });
  });
});
