import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ─── Public Endpoints ───────────────────────────────────────────────────────

  /**
   * Get all categories in a tree structure.
   * Public endpoint - used for navigation menus and category browsing.
   */
  @Get()
  @Public()
  async findAll() {
    return this.categoriesService.findAll();
  }

  /**
   * Get all categories in a flat list with depth information.
   * Useful for dropdown selects in admin forms.
   */
  @Get('flat')
  @Public()
  async findFlat() {
    return this.categoriesService.findFlat();
  }

  /**
   * Get a single category by slug with parent and children info.
   * Public endpoint for category detail pages.
   */
  @Get(':slug')
  @Public()
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  // ─── Admin Endpoints ───────────────────────────────────────────────────────

  /**
   * Create a new category.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  /**
   * Update an existing category by ID.
   * Includes circular reference prevention for parent changes.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * Drag-drop reorder. Body `{ targetId }` — moves the path
   * category to sit immediately before `targetId` in the tree.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Patch(':id/reorder')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async reorder(@Param('id') id: string, @Body() body: { targetId: string }) {
    return this.categoriesService.reorder(id, body.targetId);
  }

  /**
   * Delete a category by ID.
   * Child categories will be reassigned to the deleted category's parent.
   * Cannot delete categories that have associated products.
   * Restricted to ADMIN and SUPER_ADMIN roles.
   */
  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
