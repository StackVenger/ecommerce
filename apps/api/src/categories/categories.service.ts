import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * Represents a category with its nested children in a tree structure.
 */
export interface CategoryTreeNode {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  image: string | null;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children: CategoryTreeNode[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a flattened category for use in dropdowns/selects.
 */
export interface CategoryFlat {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  parentId: string | null;
  depth: number;
  fullPath: string;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  // ─── Tree Operations ────────────────────────────────────────────────────────

  /**
   * Fetch all categories and build a tree structure.
   * Uses recursive assembly from a flat list for efficiency.
   */
  async findAll(): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    // Build a lookup map for O(n) tree assembly
    const nodeMap = new Map<string, CategoryTreeNode>();
    const roots: CategoryTreeNode[] = [];

    // First pass: create all nodes
    for (const category of categories) {
      const node: CategoryTreeNode = {
        id: category.id,
        name: category.name,
        nameBn: category.nameBn,
        slug: category.slug,
        image: category.image,
        description: category.description,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        productCount: category._count.products,
        children: [],
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
      nodeMap.set(category.id, node);
    }

    // Second pass: build the tree
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    this.logger.debug(
      `Built category tree with ${roots.length} root nodes from ${categories.length} total categories`,
    );

    return roots;
  }

  /**
   * Fetch all categories in a flat list for use in dropdowns.
   * Each item includes its depth level and the full path from root.
   */
  async findFlat(): Promise<CategoryFlat[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        nameBn: true,
        slug: true,
        parentId: true,
      },
    });

    // Build parent lookup
    const categoryMap = new Map<string, { name: string; parentId: string | null }>();
    for (const cat of categories) {
      categoryMap.set(cat.id, { name: cat.name, parentId: cat.parentId });
    }

    // Calculate depth and full path for each category
    const flatList: CategoryFlat[] = [];

    for (const cat of categories) {
      const path: string[] = [];
      let depth = 0;
      let currentId: string | null = cat.parentId;

      // Walk up the tree to build path and calculate depth
      while (currentId) {
        const parent = categoryMap.get(currentId);
        if (!parent) {
          break;
        }
        path.unshift(parent.name);
        currentId = parent.parentId;
        depth++;

        // Safety check to prevent infinite loops from bad data
        if (depth > 20) {
          this.logger.warn(`Possible circular reference detected for category ${cat.id}`);
          break;
        }
      }

      path.push(cat.name);

      flatList.push({
        id: cat.id,
        name: cat.name,
        nameBn: cat.nameBn,
        slug: cat.slug,
        parentId: cat.parentId,
        depth,
        fullPath: path.join(' > '),
      });
    }

    // Sort by full path for a natural tree ordering
    flatList.sort((a, b) => a.fullPath.localeCompare(b.fullPath));

    return flatList;
  }

  // ─── CRUD Operations ────────────────────────────────────────────────────────

  /**
   * Find a single category by its slug.
   * Includes parent info and immediate children.
   */
  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            nameBn: true,
            slug: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            nameBn: true,
            slug: true,
            image: true,
            description: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return {
      ...category,
      productCount: category._count.products,
      _count: undefined,
    };
  }

  /**
   * Create a new category.
   * Validates that the slug is unique and the parent exists (if specified).
   */
  async create(dto: CreateCategoryDto) {
    // Check for duplicate slug
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSlug) {
      throw new ConflictException(`A category with slug "${dto.slug}" already exists`);
    }

    // Validate parent exists if parentId is provided
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent category with ID "${dto.parentId}" not found`);
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        nameBn: dto.nameBn,
        slug: dto.slug,
        parentId: dto.parentId || null,
        image: dto.image,
        description: dto.description,
        metaTitle: dto.metaTitle || dto.name,
        metaDescription: dto.metaDescription || dto.description,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    this.logger.log(`Created category "${category.name}" (${category.id})`);

    return category;
  }

  /**
   * Update an existing category.
   * Includes circular reference prevention - a category cannot be set as
   * its own parent or as a descendant of itself.
   */
  async update(id: string, dto: UpdateCategoryDto) {
    // Verify the category exists
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    // Check for duplicate slug (if changing slug)
    if (dto.slug && dto.slug !== existing.slug) {
      const existingSlug = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });

      if (existingSlug) {
        throw new ConflictException(`A category with slug "${dto.slug}" already exists`);
      }
    }

    // Validate parent change - prevent circular references
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      if (dto.parentId) {
        // Check that the new parent exists
        const parent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
        });

        if (!parent) {
          throw new NotFoundException(`Parent category with ID "${dto.parentId}" not found`);
        }

        // Check that the new parent is not a descendant of this category
        const isDescendant = await this.isDescendantOf(dto.parentId, id);
        if (isDescendant) {
          throw new BadRequestException(
            'Cannot set parent to a descendant category - this would create a circular reference',
          );
        }
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameBn !== undefined && { nameBn: dto.nameBn }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId || null }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (dto.image !== undefined && existing.image && dto.image !== existing.image) {
      await this.uploadService.deleteByUrl(existing.image);
    }

    this.logger.log(`Updated category "${category.name}" (${category.id})`);

    return category;
  }

  /**
   * Delete a category by ID.
   * Will reassign child categories to the deleted category's parent
   * to prevent orphaned branches.
   */
  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    // Prevent deletion if category has products
    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" - it has ${category._count.products} associated products. ` +
          'Please reassign or remove the products first.',
      );
    }

    // Reassign children to the deleted category's parent
    if (category._count.children > 0) {
      await this.prisma.category.updateMany({
        where: { parentId: id },
        data: { parentId: category.parentId },
      });

      this.logger.log(
        `Reassigned ${category._count.children} child categories from "${category.name}" to parent ${category.parentId || 'root'}`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });
    await this.uploadService.deleteByUrl(category.image);

    this.logger.log(`Deleted category "${category.name}" (${id})`);

    return {
      message: `Category "${category.name}" has been deleted`,
      reassignedChildren: category._count.children,
    };
  }

  /**
   * Drag-drop reorder: move `draggedId` to sit immediately before
   * `targetId` in the tree. The dragged category adopts the target's
   * `parentId` and takes its `sortOrder`; siblings at or after the
   * insertion point shift by +1. Cycles (dropping a category onto its
   * own descendant) are rejected.
   */
  async reorder(draggedId: string, targetId: string) {
    if (!targetId || draggedId === targetId) {
      return { message: 'No-op' };
    }

    const [dragged, target] = await Promise.all([
      this.prisma.category.findUnique({
        where: { id: draggedId },
        select: { id: true, name: true, parentId: true, sortOrder: true },
      }),
      this.prisma.category.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, parentId: true, sortOrder: true },
      }),
    ]);

    if (!dragged) {
      throw new NotFoundException(`Category "${draggedId}" not found`);
    }
    if (!target) {
      throw new NotFoundException(`Category "${targetId}" not found`);
    }

    // Reject moving a category into its own descendant.
    let cursor: { id: string; parentId: string | null } | null = {
      id: target.id,
      parentId: target.parentId,
    };
    while (cursor?.parentId) {
      if (cursor.parentId === draggedId) {
        throw new BadRequestException('Cannot move a category into its own descendant');
      }
      cursor = await this.prisma.category.findUnique({
        where: { id: cursor.parentId },
        select: { id: true, parentId: true },
      });
    }

    const newParentId = target.parentId;
    const newSortOrder = target.sortOrder;

    await this.prisma.$transaction(async (tx) => {
      // Make room at the target slot among the new sibling group.
      await tx.category.updateMany({
        where: {
          parentId: newParentId,
          sortOrder: { gte: newSortOrder },
          id: { not: draggedId },
        },
        data: { sortOrder: { increment: 1 } },
      });

      await tx.category.update({
        where: { id: draggedId },
        data: { parentId: newParentId, sortOrder: newSortOrder },
      });
    });

    this.logger.log(
      `Reordered "${dragged.name}" before "${target.name}" under parent ${newParentId ?? 'root'}`,
    );

    return { message: 'Reordered' };
  }

  // ─── Helper Methods ─────────────────────────────────────────────────────────

  /**
   * Check if a category is a descendant of another category.
   * Used to prevent circular references when updating parent relationships.
   *
   * @param categoryId - The potential descendant category ID
   * @param ancestorId - The potential ancestor category ID
   * @returns true if categoryId is a descendant of ancestorId
   */
  private async isDescendantOf(categoryId: string, ancestorId: string): Promise<boolean> {
    // Get all descendants of the ancestor
    const descendants = await this.getDescendantIds(ancestorId);
    return descendants.includes(categoryId);
  }

  /**
   * Recursively get all descendant IDs of a category.
   */
  private async getDescendantIds(categoryId: string): Promise<string[]> {
    const children = await this.prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });

    const descendantIds: string[] = [];

    for (const child of children) {
      descendantIds.push(child.id);
      const childDescendants = await this.getDescendantIds(child.id);
      descendantIds.push(...childDescendants);
    }

    return descendantIds;
  }
}
