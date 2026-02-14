"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
const orders_service_1 = require("../orders/orders.service");
const mail_service_1 = require("../mail/mail.service");
let PaymentsController = PaymentsController_1 = class PaymentsController {
    constructor(svc, ordersService, mailService) {
        this.svc = svc;
        this.ordersService = ordersService;
        this.mailService = mailService;
        this.logger = new common_1.Logger(PaymentsController_1.name);
    }
    async createQris(body) {
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
            throw new common_1.BadRequestException('Order already paid');
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
    async status(merchantOrderId) {
        return this.svc.checkStatus(merchantOrderId);
    }
    async getOrder(merchantOrderId) {
        const order = this.ordersService.getOrder(merchantOrderId);
        if (!order) {
            return { found: false };
        }
        return { found: true, order };
    }
    async duitkuCallback(req) {
        const { merchantOrderId, resultCode, reference, productDetail } = req.body;
        this.logger.log(`Received callback for order: ${merchantOrderId}, resultCode: ${resultCode}`);
        // Validate callback signature before updating anything
        const ok = this.svc.verifyCallbackSignature(req.body);
        if (!ok) {
            this.logger.error(`Invalid signature for order ${merchantOrderId}`);
            throw new common_1.BadRequestException('Bad signature');
        }
        // resultCode "00" means success in Duitku
        let status = 'FAILED';
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
            }
            catch (e) {
                // ignore
            }
            await this.mailService.sendProductEmail(order.customer.email, productData, merchantOrderId);
        }
        return { status: 'OK' };
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('qris'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "createQris", null);
__decorate([
    (0, common_1.Get)('status/:merchantOrderId'),
    __param(0, (0, common_1.Param)('merchantOrderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "status", null);
__decorate([
    (0, common_1.Get)('order/:merchantOrderId'),
    __param(0, (0, common_1.Param)('merchantOrderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getOrder", null);
__decorate([
    (0, common_1.Post)('duitku/callback'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "duitkuCallback", null);
exports.PaymentsController = PaymentsController = PaymentsController_1 = __decorate([
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        orders_service_1.OrdersService,
        mail_service_1.MailService])
], PaymentsController);
