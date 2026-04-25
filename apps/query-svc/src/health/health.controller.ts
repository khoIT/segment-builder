import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly cfg: ConfigService) {}

  @Public()
  @Get()
  health() {
    return {
      ok: true,
      service: 'query-svc',
      driver: this.cfg.get('QUERY_DRIVER') ?? 'mock',
      ts: new Date().toISOString(),
    };
  }
}
