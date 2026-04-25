import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { MappingExecutor } from '../mapping-executor/mapping-executor';
import { SegmentCounter } from '../segment-counter/segment-counter';
import { ProfilePgClient } from '../trino-explorer/profile-pg-client';

@Module({
  controllers: [QueryController],
  providers: [MappingExecutor, SegmentCounter, ProfilePgClient],
})
export class QueryModule {}
