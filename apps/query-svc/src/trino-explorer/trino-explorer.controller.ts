import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtVerifyGuard } from '../common/jwt-verify.guard';
import { TrinoExplorerService } from './trino-explorer.service';

// Browseable view of the iceberg catalog. Powers RawExplorer.jsx +
// MappingStudio template-picker drawer (lets users pick `iceberg.<schema>.
// <table>` when authoring custom mappings later). Schemas + DESCRIBE
// are cheap; sample is hard-capped at 200 rows server-side.
@Controller('q/trino')
@UseGuards(JwtVerifyGuard)
export class TrinoExplorerController {
  constructor(private readonly svc: TrinoExplorerService) {}

  @Get('schemas')
  schemas(@Query('catalog') catalog?: string) {
    return this.svc.listSchemas(catalog);
  }

  @Get('schemas/:schema/tables')
  tables(@Param('schema') schema: string, @Query('catalog') catalog?: string) {
    return this.svc.listTables(schema, catalog);
  }

  @Get('tables/:schema/:table/describe')
  describe(
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Query('catalog') catalog?: string,
  ) {
    return this.svc.describeTable(schema, table, catalog);
  }

  @Get('tables/:schema/:table/sample')
  sample(
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Query('limit') limit?: string,
    @Query('catalog') catalog?: string,
  ) {
    return this.svc.sampleTable(schema, table, limit ? Number(limit) : 50, catalog);
  }

  @Get('profile/:catalog/:schema/:table/:column')
  profile(
    @Param('catalog') catalog: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Param('column') column: string,
  ) {
    return this.svc.profileColumn(catalog, schema, table, column);
  }
}
