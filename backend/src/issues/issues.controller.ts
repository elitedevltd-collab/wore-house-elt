import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';

@ApiTags('issues')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('issues')
export class IssuesController {
  constructor(private service: IssuesService) {}

  @RequirePermissions('stock.issue')
  @Post()
  create(@Body() dto: CreateIssueDto) {
    return this.service.create(dto);
  }

  @RequirePermissions('stock.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('stock.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('stock.issue')
  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.service.confirm(id, req.user.userId);
  }

  @RequirePermissions('stock.issue')
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
