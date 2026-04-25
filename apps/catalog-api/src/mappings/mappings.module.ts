import { Module } from '@nestjs/common';
import { MappingsService } from './mappings.service';
import { MappingsController, MappingTemplatesController } from './mappings.controller';

@Module({
  providers: [MappingsService],
  controllers: [MappingsController, MappingTemplatesController],
  exports: [MappingsService],
})
export class MappingsModule {}
