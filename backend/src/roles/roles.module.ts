import { Injectable } from '@nestjs/common';
import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class RolesService {
  constructor(private prisma: PrismaService) {}

  findAllRoles() {
    return this.prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: { module: 'asc' } });
  }
}

@ApiTags('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
class RolesController {
  constructor(private service: RolesService) {}

  @RequirePermissions('users.view')
  @Get()
  findAll() {
    return this.service.findAllRoles();
  }
}

@ApiTags('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
class PermissionsController {
  constructor(private service: RolesService) {}

  @RequirePermissions('users.view')
  @Get()
  findAll() {
    return this.service.findAllPermissions();
  }
}

@Module({
  providers: [RolesService],
  controllers: [RolesController, PermissionsController],
})
export class RolesModule {}
