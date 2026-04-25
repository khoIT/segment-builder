import { Module } from '@nestjs/common';
import { MasterTablesService } from './master-tables.service';
import { MasterTablesController } from './master-tables.controller';
import { BuildOrchestrator } from './build-orchestrator';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  providers: [MasterTablesService, BuildOrchestrator],
  controllers: [MasterTablesController],
})
export class MasterTablesModule {}
