
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MailService } from '../mail/mail.service';
import { OrdersService } from '../orders/orders.service';

@Module({
  imports: [HttpModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MailService, OrdersService],
})
export class PaymentsModule { }

