import { Module } from '@nestjs/common';
import { TrinoExplorerService } from './trino-explorer.service';
import { TrinoExplorerController } from './trino-explorer.controller';

@Module({
  providers: [TrinoExplorerService],
  controllers: [TrinoExplorerController],
})
export class TrinoExplorerModule {}
