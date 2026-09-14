import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      include: { userRoles: { include: { role: true } }, branch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود - User not found');
    return user;
  }

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleIds?: string[];
    branchId?: string;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل - Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        branchId: data.branchId,
        userRoles: data.roleIds
          ? { create: data.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      include: { userRoles: { include: { role: true } } },
    });
  }

  async update(id: string, data: Partial<{ firstName: string; lastName: string; isActive: boolean }>) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data });
  }

  async assignRoles(id: string, roleIds: string[]) {
    await this.findOne(id);
    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId: id, roleId })),
    });
    return this.findOne(id);
  }

  async softDelete(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
