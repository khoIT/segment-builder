import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { MappingExecutor } from '../mapping-executor/mapping-executor';

@Module({ controllers: [QueryController], providers: [MappingExecutor] })
export class QueryModule {}
