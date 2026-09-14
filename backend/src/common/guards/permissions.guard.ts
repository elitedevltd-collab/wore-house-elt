import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('غير مصرح - Not authenticated');
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.userId },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });

    const userPermissionCodes = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        userPermissionCodes.add(rp.permission.code);
      }
    }

    const hasAll = required.every((p) => userPermissionCodes.has(p));
    if (!hasAll) {
      throw new ForbiddenException('ليس لديك صلاحية لتنفيذ هذا الإجراء - Insufficient permissions');
    }
    return true;
  }
}
