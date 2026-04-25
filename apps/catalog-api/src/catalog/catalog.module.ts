import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { DataCatalogController } from './data-catalog.controller';
import { DataCatalogService } from './data-catalog.service';

@Module({
  controllers: [CatalogController, DataCatalogController],
  providers: [DataCatalogService],
  exports: [DataCatalogService],
})
export class CatalogModule {}
