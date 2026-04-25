import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CatalogClient } from './catalog-client.service';

@Global()
@Module({ imports: [ConfigModule], providers: [CatalogClient], exports: [CatalogClient] })
export class CatalogClientModule {}
