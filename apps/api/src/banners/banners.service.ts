import { Injectable, NotFoundException } from '@nestjs/common';

import { RevalidateService } from '../common/revalidate/revalidate.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
    private readonly uploadService: UploadService,
  ) {}

  async create(dto: CreateBannerDto) {
    const maxSortOrder = await this.prisma.banner.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const {
      imageMobile,
      startDate,
      endDate,
      subtitle,
      subtitleBn,
      buttonText,
      buttonTextBn,
      backgroundColor: _backgroundColor,
      textColor: _textColor,
      ...rest
    } = dto;

    const banner = await this.prisma.banner.create({
      data: {
        ...rest,
        subtitle: subtitle ?? null,
        subtitleBn: subtitleBn ?? null,
        ctaText: buttonText ?? null,
        ctaTextBn: buttonTextBn ?? null,
        mobileImage: imageMobile ?? null,
        startsAt: startDate ? new Date(startDate) : null,
        endsAt: endDate ? new Date(endDate) : null,
        sortOrder,
      },
    });
    void this.revalidate.revalidate({ tags: ['site-config', 'banners'] });
    return banner;
  }

  async findAll() {
    const banners = await this.prisma.banner.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return { banners };
  }

  async findActive(position?: string) {
    const now = new Date();

    // The enum in Prisma is all-uppercase (HERO, SIDEBAR, FOOTER, POPUP).
    // Accept case-insensitive input from the web's `getBannersByPosition`
    // and drop invalid values rather than 400'ing — an unknown position
    // simply returns all active banners.
    const validPositions = new Set(['HERO', 'SIDEBAR', 'FOOTER', 'POPUP']);
    const normalized = position?.toUpperCase();
    const filterByPosition = normalized && validPositions.has(normalized);

    const banners = await this.prisma.banner.findMany({
      where: {
        isActive: true,
        ...(filterByPosition
          ? { position: normalized as 'HERO' | 'SIDEBAR' | 'FOOTER' | 'POPUP' }
          : {}),
        OR: [
          { startsAt: null, endsAt: null },
          { startsAt: { lte: now }, endsAt: null },
          { startsAt: null, endsAt: { gte: now } },
          { startsAt: { lte: now }, endsAt: { gte: now } },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Preserve the { banners } shape for any existing caller; also return
    // `data` so admin controllers / site-config.ts destructuring stays
    // consistent with other resources.
    return { banners, data: banners };
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async update(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const {
      imageMobile,
      startDate,
      endDate,
      subtitle,
      subtitleBn,
      buttonText,
      buttonTextBn,
      backgroundColor: _backgroundColor,
      textColor: _textColor,
      ...rest
    } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (imageMobile !== undefined) {
      data.mobileImage = imageMobile;
    }
    if (subtitle !== undefined) {
      data.subtitle = subtitle;
    }
    if (subtitleBn !== undefined) {
      data.subtitleBn = subtitleBn;
    }
    if (buttonText !== undefined) {
      data.ctaText = buttonText;
    }
    if (buttonTextBn !== undefined) {
      data.ctaTextBn = buttonTextBn;
    }
    if (startDate) {
      data.startsAt = new Date(startDate);
    }
    if (endDate) {
      data.endsAt = new Date(endDate);
    }

    const updated = await this.prisma.banner.update({ where: { id }, data });

    // Destroy any Cloudinary assets orphaned by this update.
    const oldUrls: string[] = [];
    if (data.image !== undefined && banner.image && data.image !== banner.image) {
      oldUrls.push(banner.image);
    }
    if (
      data.mobileImage !== undefined &&
      banner.mobileImage &&
      data.mobileImage !== banner.mobileImage
    ) {
      oldUrls.push(banner.mobileImage);
    }
    if (oldUrls.length > 0) {
      await this.uploadService.deleteByUrls(oldUrls);
    }

    void this.revalidate.revalidate({ tags: ['site-config', 'banners'] });
    return updated;
  }

  async remove(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    const deleted = await this.prisma.banner.delete({ where: { id } });
    await this.uploadService.deleteByUrls([banner.image, banner.mobileImage]);
    void this.revalidate.revalidate({ tags: ['site-config', 'banners'] });
    return deleted;
  }

  async reorder(positions: { id: string; sortOrder: number }[]) {
    const updates = positions.map((item) =>
      this.prisma.banner.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    );

    await this.prisma.$transaction(updates);
    void this.revalidate.revalidate({ tags: ['site-config', 'banners'] });
    return { success: true };
  }
}
