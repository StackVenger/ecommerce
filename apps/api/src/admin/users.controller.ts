import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminUserQueryDto, CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { AdminUsersService } from './users.service';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  async findAll(@Query() query: AdminUserQueryDto) {
    return { data: await this.usersService.findAll(query) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.usersService.findById(id) };
  }

  @Post()
  async create(@Body() dto: CreateAdminUserDto) {
    return { data: await this.usersService.create(dto) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return { data: await this.usersService.update(id, dto) };
  }

  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return { data: await this.usersService.toggleActive(id) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return { data: await this.usersService.remove(id, user.id) };
  }
}
