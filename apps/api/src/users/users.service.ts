import { Injectable } from '@nestjs/common';
import { PrismaService } from '@auticare/prisma-client';
import { ApiException } from '../common/exceptions/api.exception.js';
import type { UpdateUserInput } from '@auticare/dto';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
    if (!user)
      throw new ApiException(404, 'USER_404', '사용자를 찾을 수 없습니다');
    return user;
  }

  async updateProfile(userId: string, data: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_SELECT,
    });
  }
}
