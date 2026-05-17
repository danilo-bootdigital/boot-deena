import { Controller, Get, Post, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
@UseGuards(SupabaseAuthGuard)
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('instances')
  listInstances() {
    return this.whatsappService.listInstances();
  }

  @Post('instances')
  createInstance(
    @Body() body: { name: string },
    @CurrentOrg() _orgId: string,
  ) {
    if (!body.name || typeof body.name !== 'string' || !/^[a-zA-Z0-9-]+$/.test(body.name)) {
      throw new BadRequestException('name is required and must contain only letters, numbers, and hyphens');
    }
    const webhookUrl = `${process.env.API_PUBLIC_URL || 'http://localhost:3001'}/api/v1/webhook/evolution`;
    return this.whatsappService.createInstance(body.name, webhookUrl);
  }

  @Get('instances/:name/status')
  getStatus(@Param('name') name: string) {
    return this.whatsappService.getInstanceStatus(name);
  }

  @Get('instances/:name/qr')
  getQrCode(@Param('name') name: string) {
    return this.whatsappService.getQrCode(name);
  }

  @Delete('instances/:name')
  deleteInstance(@Param('name') name: string) {
    return this.whatsappService.deleteInstance(name);
  }
}
