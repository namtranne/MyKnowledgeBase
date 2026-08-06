import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  // GET /api/health -> lightweight keep-alive / uptime check.
  @Get('health')
  health() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
