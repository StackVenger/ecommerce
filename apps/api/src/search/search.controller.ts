import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { FacetsService } from './facets.service';
import { SearchService } from './search.service';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
@Public()
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly facetsService: FacetsService,
  ) {}

  /** GET /search?q=keyword&page=1&limit=20&... */
  @Get()
  async search(
    @Query('q') q: string,
    @CurrentUser() user: AuthenticatedUser | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: string,
    @Query('inStock') inStock?: string,
  ) {
    const result = await this.searchService.search({
      query: q ?? '',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      categoryId,
      brandId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: (sortBy as any) ?? 'relevance',
      inStock: inStock === 'true',
    });

    // Log search term for analytics (fire-and-forget). Admin staff browsing
    // the storefront never count toward "Most Searched Terms".
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    if (q?.trim() && !isAdmin) {
      this.searchService
        .logSearch(q, result.pagination?.total ?? 0)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    }

    return { data: result };
  }

  /** GET /search/suggest?q=keyword — autocomplete suggestions */
  @Get('suggest')
  async suggest(@Query('q') q: string, @Query('limit') limit?: string) {
    const results = await this.searchService.suggest(q ?? '', limit ? Number(limit) : 8);
    return { data: results };
  }

  /** GET /search/popular — trending search terms */
  @Get('popular')
  async popular(@Query('limit') limit?: string) {
    const terms = await this.searchService.getPopularSearches(limit ? Number(limit) : 10);
    return { data: terms };
  }
}

@Controller('products')
export class ProductFacetsController {
  constructor(private readonly facetsService: FacetsService) {}

  /** GET /products/facets?categoryId=...&q=... — faceted filters */
  @Get('facets')
  async getFacets(@Query('categoryId') categoryId?: string, @Query('q') query?: string) {
    const facets = await this.facetsService.getFacets({ categoryId, query });
    return { data: facets };
  }
}
