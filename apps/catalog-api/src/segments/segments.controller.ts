import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { BedrockClaims } from '../auth/auth.service';
import { SegmentsService } from './segments.service';
import { SchedulerService } from '../scheduler/scheduler.service';

@Controller('segments')
export class SegmentsController {
  constructor(
    private readonly svc: SegmentsService,
    private readonly scheduler: SchedulerService,
  ) {}

  // Trigger an immediate nightly-style recompute of every segment with
  // {all|any} criteria. Useful for ops + the demo.
  @Post('recompute')
  async recompute() {
    const jobId = await this.scheduler.runRecomputeNow();
    return { jobId };
  }

  @Get()
  async list(
    @Query('game') game?: string,
    @Query('status') status?: string,
    @Query('owner') owner?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.list({
      game, status, owner, search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>, @CurrentUser() user: BedrockClaims) {
    return this.svc.create(body, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown> & { ifMatch: number },
    @CurrentUser() user: BedrockClaims,
  ) {
    const { ifMatch, ...patch } = body;
    return this.svc.update(id, patch, ifMatch, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: BedrockClaims) {
    return this.svc.remove(id, user);
  }
}
