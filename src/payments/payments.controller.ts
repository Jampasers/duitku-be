import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Post('qris')
  async createQris(@Body() body: any) {
    /**
     * Expected body:
     * {
     *   merchantOrderId: string,
     *   amount: number,
     *   productDetails: string,
     *   customer: { name: string, email: string, phone?: string }
     * }
     */
    return this.svc.createQrisInvoice(body);
  }

  @Get('status/:merchantOrderId')
  async status(@Param('merchantOrderId') merchantOrderId: string) {
    return this.svc.checkStatus(merchantOrderId);
  }

  @Post('duitku/callback')
  async duitkuCallback(@Req() req: any) {
    // Validate callback signature before updating anything
    const ok = this.svc.verifyCallbackSignature(req.body);
    if (!ok) throw new BadRequestException('Bad signature');

    // TODO: Update your order in DB (paid/failed/expired) based on callback fields.
    // Duitku sends fields such as merchantOrderId, amount, reference, resultCode, signature, etc.
    return { status: 'OK' };
  }
}
