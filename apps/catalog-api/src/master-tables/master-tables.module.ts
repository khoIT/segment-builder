import { Module } from '@nestjs/common';
import { MasterTablesService } from './master-tables.service';
import { MasterTablesController } from './master-tables.controller';
import { BuildOrchestrator } from './build-orchestrator';

@Module({
  providers: [MasterTablesService, BuildOrchestrator],
  controllers: [MasterTablesController],
})
export class MasterTablesModule {}
