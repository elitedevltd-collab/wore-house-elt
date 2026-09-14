import { Injectable, Controller, Get, Module, UseGuards, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class AuditService {
  constructor(private prisma: PrismaService) {}

  findAll(entityType?: string) {
    return this.prisma.auditLog.findMany({
      where: entityType ? { entityType } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }
}

@ApiTags('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit')
class AuditController {
  constructor(private service: AuditService) {}

  @RequirePermissions('audit.view')
  @Get()
  findAll(@Query('entityType') entityType?: string) {
    return this.service.findAll(entityType);
  }
}

@Module({
  providers: [AuditService],
  controllers: [AuditController],
})
export class AuditModule {}
