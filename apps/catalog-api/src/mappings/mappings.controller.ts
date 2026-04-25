import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { BedrockClaims } from '../auth/auth.service';
import { MappingsService } from './mappings.service';
import { MAPPING_TEMPLATES } from '@bedrock/contracts';

@Controller('mappings')
export class MappingsController {
  constructor(private readonly svc: MappingsService) {}

  @Get()
  list(
    @Query('game') game?: string,
    @Query('templateId') templateId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.svc.list({
      game, templateId, search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  cloneFromTemplate(
    @Body() body: { templateId: string; name: string; gameId: string; params?: Record<string, unknown> },
    @CurrentUser() user: BedrockClaims,
  ) {
    return this.svc.cloneFromTemplate({
      templateId: body.templateId,
      name: body.name,
      gameId: body.gameId,
      params: body.params ?? {},
    }, user);
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

// Read-only catalogue of the 6 starter templates from @bedrock/contracts.
// Frontend uses these to render template-picker drawer + parameter forms.
@Controller('mapping-templates')
export class MappingTemplatesController {
  @Get()
  list() {
    return { items: MAPPING_TEMPLATES };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const tpl = MAPPING_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return { error: 'template not found' };
    return tpl;
  }
}
