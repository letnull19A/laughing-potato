import { Controller, Get } from '@nestjs/common';

@Controller('telegram')
export class TelegramController {
  @Get('health')
  health(): { ok: boolean } {
    return { ok: true };
  }
}
