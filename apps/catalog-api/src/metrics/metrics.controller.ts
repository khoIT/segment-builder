import {
  Body, Controller, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { BedrockClaims } from '../auth/auth.service';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly svc: MetricsService) {}

  @Get()
  async list(
    @CurrentUser() user: BedrockClaims,
    @Query('topGroup') topGroup?: string,
    @Query('category') category?: string,
    @Query('realtime') realtime?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('pinnedOnly') pinnedOnly?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.list({
      topGroup, category, status, type, search,
      realtime: realtime === 'true' ? true : realtime === 'false' ? false : undefined,
      pinnedOnly: pinnedOnly === 'true',
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    }, user.sub);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Get(':id/bindings')
  async bindings(@Param('id') id: string) {
    return { items: await this.svc.bindings(id) };
  }

  @Post()
  async create(@Body() body: Record<string, unknown>, @CurrentUser() user: BedrockClaims) {
    return this.svc.create(body, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown> & { ifMatch: number },
    @CurrentUser() user: BedrockClaims,
  ) {
    const { ifMatch, ...patch } = body;
    return this.svc.update(id, patch, ifMatch, user);
  }
}
