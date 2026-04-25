import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { BedrockClaims } from '../auth/auth.service';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  // Admin-only — audit access reveals user behaviour, must be gated.
  @Get()
  async list(
    @CurrentUser() user: BedrockClaims,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('limit') limit?: string,
  ) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('audit log requires admin role');
    }
    return {
      items: await this.audit.list({
        actorId, entity, entityId, action, since, until,
        limit: limit ? Number(limit) : undefined,
      }),
    };
  }
}
