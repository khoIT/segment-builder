import { Module } from '@nestjs/common';
import { TrinoExplorerService } from './trino-explorer.service';
import { TrinoExplorerController } from './trino-explorer.controller';
import { ProfileRunner } from './profile-runner';
import { ProfileCache } from './profile-cache';
import { ProfilePgClient } from './profile-pg-client';

@Module({
  providers: [TrinoExplorerService, ProfileRunner, ProfileCache, ProfilePgClient],
  controllers: [TrinoExplorerController],
})
export class TrinoExplorerModule {}
