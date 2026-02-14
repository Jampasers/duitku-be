
import { BadRequestException, Body, Controller, Get, Param, Post, Req, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';
import { MailService } from '../mail/mail.service';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly svc: PaymentsService,
    private readonly ordersService: OrdersService,
    private readonly mailService: MailService,
  ) { }

  @Post('qris')
  async createQris(@Body() body: any) {
    this.logger.debug(`Received QRIS request body: ${JSON.stringify(body)}`);
    /**
     * Expected body:
     * {
     *   merchantOrderId: string,
     *   amount: number,
     *   productDetails: string, // JSON string or simple string
     *   customer: { name: string, email: string, phone?: string }
     * }
     */

    // duplicate check if you want, or just rely on merchantOrderId uniqueness in DB
    const existing = this.ordersService.getOrder(body.merchantOrderId);
    if (existing && existing.status === 'PAID') {
      throw new BadRequestException('Order already paid');
    }

    // Create local order record
    this.ordersService.createOrder({
      merchantOrderId: body.merchantOrderId,
      amount: body.amount,
      productDetails: body.productDetails,
      customer: body.customer,
      reference: '', // will be updated
    });

    return this.svc.createQrisInvoice(body);
  }

  @Get('status/:merchantOrderId')
  async status(@Param('merchantOrderId') merchantOrderId: string) {
    return this.svc.checkStatus(merchantOrderId);
  }

  @Get('order/:merchantOrderId')
  async getOrder(@Param('merchantOrderId') merchantOrderId: string) {
    const order = this.ordersService.getOrder(merchantOrderId);
    if (!order) {
      return { found: false };
    }
    return { found: true, order };
  }

  @Post('duitku/callback')
  async duitkuCallback(@Req() req: any) {
    const { merchantOrderId, resultCode, reference, productDetail } = req.body;

    this.logger.log(`Received callback for order: ${merchantOrderId}, resultCode: ${resultCode}`);

    // Validate callback signature before updating anything
    const ok = this.svc.verifyCallbackSignature(req.body);
    if (!ok) {
      this.logger.error(`Invalid signature for order ${merchantOrderId}`);
      throw new BadRequestException('Bad signature');
    }

    // resultCode "00" means success in Duitku
    let status: 'PAID' | 'FAILED' = 'FAILED';
    if (resultCode === '00') {
      status = 'PAID';
    }

    const order = this.ordersService.updateOrderStatus(merchantOrderId, status, reference);

    if (status === 'PAID' && order) {
      // Send email with product info
      this.logger.log(`Payment successful for ${merchantOrderId}. Sending email to ${order.customer.email}...`);

      // Parse product details if it's a JSON string, or pass as is
      let productData = order.productDetails;
      try {
        if (typeof productData === 'string') {
          productData = JSON.parse(productData);
        }
      } catch (e) {
        // ignore
      }

      await this.mailService.sendProductEmail(order.customer.email, productData, merchantOrderId);
    }

    return { status: 'OK' };
  }
}

