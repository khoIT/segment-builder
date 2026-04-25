import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';
import { CreateConnectorRequest } from '@bedrock/contracts';
import type { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('connectors')
export class ConnectorsController {
  constructor(private readonly svc: ConnectorsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateConnectorRequest))
    body: z.infer<typeof CreateConnectorRequest>,
  ) {
    return this.svc.create(body);
  }

  @Post(':id/test')
  test(@Param('id') id: string) {
    return this.svc.testById(id);
  }
}
