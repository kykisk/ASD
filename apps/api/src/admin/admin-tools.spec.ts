import { describe, it, expect, vi } from 'vitest';
import type { PrismaService } from '@auticare/prisma-client';
import { nextRun } from './admin-jobs.service.js';
import { AdminAccountsService, generateTempPassword } from './admin-accounts.service.js';

describe('nextRun (KST schedules)', () => {
  it('daily 04:00 KST: before 04:00 KST runs the same day, after runs tomorrow', () => {
    // 2026-10-20 18:00 UTC = 10/21 03:00 KST → 10/21 04:00 KST = 10/20 19:00 UTC
    expect(
      nextRun(
        { minute: 0, hour: 4, weekday: null },
        new Date('2026-10-20T18:00:00Z'),
      )?.toISOString(),
    ).toBe('2026-10-20T19:00:00.000Z');
    // 10/21 05:00 KST → 10/22 04:00 KST
    expect(
      nextRun(
        { minute: 0, hour: 4, weekday: null },
        new Date('2026-10-20T20:00:00Z'),
      )?.toISOString(),
    ).toBe('2026-10-21T19:00:00.000Z');
  });

  it('weekly Monday 08:00 KST', () => {
    // 2026-10-21 is a Wednesday → next Monday 10/26 08:00 KST = 10/25 23:00 UTC
    expect(
      nextRun({ minute: 0, hour: 8, weekday: 1 }, new Date('2026-10-21T03:00:00Z'))?.toISOString(),
    ).toBe('2026-10-25T23:00:00.000Z');
  });

  it('manual-only jobs have no next run', () => {
    expect(nextRun(null)).toBeNull();
  });
});

describe('generateTempPassword', () => {
  it('always satisfies the password policy', () => {
    for (let i = 0; i < 200; i++) {
      const pw = generateTempPassword();
      expect(pw).toHaveLength(12);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^A-Za-z0-9]/);
    }
  });
});

describe('AdminAccountsService.deleteUser', () => {
  const prisma = {
    user: { findUnique: vi.fn(), delete: vi.fn() },
    familyMember: { count: vi.fn() },
    child: { findMany: vi.fn() },
    activityLog: { deleteMany: vi.fn() },
    sessionFeedback: { deleteMany: vi.fn() },
    curriculum: { deleteMany: vi.fn() },
    assessment: { deleteMany: vi.fn() },
    family: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  const service = new AdminAccountsService(prisma as unknown as PrismaService);

  it('refuses when the confirmation email does not match', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'qa-1@example.com',
      role: 'FAMILY_ADMIN',
      familyMembers: [],
    });
    await expect(service.deleteUser('u1', 'other@example.com')).rejects.toThrow(
      '일치하지 않습니다',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('never deletes the system admin', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin',
      email: 'admin@auticare.com',
      role: 'SYSTEM_ADMIN',
      familyMembers: [],
    });
    await expect(service.deleteUser('admin', 'admin@auticare.com')).rejects.toThrow(
      '지울 수 없습니다',
    );
  });

  it('removes a family only when the user is its only member', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'qa-1@example.com',
      role: 'FAMILY_ADMIN',
      familyMembers: [{ familyId: 'solo' }, { familyId: 'shared' }],
    });
    prisma.familyMember.count.mockImplementation(
      async ({ where }: { where: { familyId: string } }) => (where.familyId === 'solo' ? 1 : 2),
    );
    prisma.child.findMany.mockResolvedValue([{ id: 'c1' }]);
    prisma.$transaction.mockResolvedValue([]);

    const result = await service.deleteUser('u1', 'QA-1@example.com');

    expect(prisma.family.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['solo'] } } });
    expect(result).toEqual({ email: 'qa-1@example.com', deletedFamilies: 1, deletedChildren: 1 });
  });
});
