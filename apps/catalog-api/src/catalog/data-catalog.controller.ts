import { Controller, Get, Param, Query } from '@nestjs/common';
import { DataCatalogService } from './data-catalog.service';

@Controller('catalog')
export class DataCatalogController {
  constructor(private readonly svc: DataCatalogService) {}

  @Get()
  async list(
    @Query('game') game?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.list({ game, category, search });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Get(':id/lineage')
  async lineage(@Param('id') id: string) {
    return this.svc.lineage(id);
  }
}
