import { Module } from '@nestjs/common';
import { PinsController } from './pins.controller';

@Module({ controllers: [PinsController] })
export class PinsModule {}
