import {
  Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { BedrockClaims } from '../auth/auth.service';
import { MasterTablesService } from './master-tables.service';
import { BuildOrchestrator } from './build-orchestrator';

@Controller('master-tables')
export class MasterTablesController {
  constructor(
    private readonly svc: MasterTablesService,
    private readonly orchestrator: BuildOrchestrator,
  ) {}

  @Get()
  list(
    @Query('game') game?: string,
    @Query('templateId') templateId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.list({
      game, templateId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  create(
    @Body() body: { name: string; gameId: string; mappingId: string },
    @CurrentUser() user: BedrockClaims,
  ) {
    return this.svc.create(body, user);
  }

  // Trigger a build. Forwards the user's JWT to query-svc so the
  // executor inherits the same identity. Returns the BuildJob id;
  // poll via GET /:id/build/:jobId for progress.
  @Post(':id/build')
  async build(@Param('id') id: string, @Req() req: Request) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }
    const userToken = auth.slice(7);
    return this.orchestrator.start(id, userToken);
  }

  @Get(':id/build/:jobId')
  buildStatus(@Param('jobId') jobId: string) {
    return this.orchestrator.status(jobId);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.preview(id, limit ? Number(limit) : 50);
  }

  @Get(':id/columns')
  async columns(@Param('id') id: string) {
    return { items: await this.svc.columns(id) };
  }
}
