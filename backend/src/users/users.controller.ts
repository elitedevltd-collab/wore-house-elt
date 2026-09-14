import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @RequirePermissions('users.view')
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @RequirePermissions('users.view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('users.create')
  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @RequirePermissions('users.update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @RequirePermissions('users.update')
  @Patch(':id/roles')
  assignRoles(@Param('id') id: string, @Body('roleIds') roleIds: string[]) {
    return this.service.assignRoles(id, roleIds);
  }

  @RequirePermissions('users.update')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
