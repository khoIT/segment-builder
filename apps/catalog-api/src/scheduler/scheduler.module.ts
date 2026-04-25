import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { MaterializeHandler } from './materialize.handler';
import { RecomputeSegmentsHandler } from './recompute-segments.handler';

@Module({
  providers: [SchedulerService, MaterializeHandler, RecomputeSegmentsHandler],
  exports: [SchedulerService],
})
export class SchedulerModule {}
