"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const crypto = __importStar(require("crypto"));
let PaymentsService = class PaymentsService {
    constructor(http) {
        this.http = http;
        this.merchantCode = process.env.DUITKU_MERCHANT_CODE || "";
        this.apiKey = process.env.DUITKU_API_KEY || "";
        this.baseUrl = process.env.DUITKU_BASE_URL || "https://sandbox.duitku.com";
        this.qrisMethod = process.env.DUITKU_QRIS_METHOD || "SP";
    }
    assertConfig() {
        if (!this.merchantCode)
            throw new common_1.BadRequestException("Missing DUITKU_MERCHANT_CODE in .env");
        if (!this.apiKey)
            throw new common_1.BadRequestException("Missing DUITKU_API_KEY in .env");
    }
    // Signature inquiry: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
    signInquiry(merchantOrderId, paymentAmount) {
        return crypto
            .createHash("md5")
            .update(`${this.merchantCode}${merchantOrderId}${paymentAmount}${this.apiKey}`)
            .digest("hex");
    }
    // Signature check status: MD5(merchantCode + merchantOrderId + apiKey)
    signStatus(merchantOrderId) {
        return crypto
            .createHash("md5")
            .update(`${this.merchantCode}${merchantOrderId}${this.apiKey}`)
            .digest("hex");
    }
    async createQrisInvoice(input) {
        this.assertConfig();
        if (!input?.merchantOrderId)
            throw new common_1.BadRequestException("merchantOrderId required");
        if (!input?.amount || input.amount <= 0)
            throw new common_1.BadRequestException("amount must be > 0");
        if (!input?.productDetails)
            throw new common_1.BadRequestException("productDetails required");
        if (!input?.customer?.name || !input?.customer?.email)
            throw new common_1.BadRequestException("customer.name and customer.email required");
        const callbackUrl = `${process.env.BACKEND_BASE_URL || "http://localhost:4000"}/payments/duitku/callback`;
        const returnUrl = `${process.env.PUBLIC_APP_URL || "http://localhost:3000"}/payment/${encodeURIComponent(input.merchantOrderId)}`;
        const payload = {
            merchantCode: this.merchantCode,
            paymentAmount: input.amount,
            paymentMethod: this.qrisMethod, // QRIS method code: SP/NQ/GQ/SQ (depends on your merchant activation)
            merchantOrderId: input.merchantOrderId,
            productDetails: input.productDetails,
            additionalParam: "",
            merchantUserInfo: "",
            customerVaName: input.customer.name,
            email: input.customer.email,
            phoneNumber: input.customer.phone ?? "",
            callbackUrl,
            returnUrl,
            signature: this.signInquiry(input.merchantOrderId, input.amount),
            expiryPeriod: 10,
        };
        console.log({ payload });
        // v2 inquiry endpoint
        const url = `${this.baseUrl}/webapi/api/merchant/v2/inquiry`;
        const { data } = await (0, rxjs_1.firstValueFrom)(this.http.post(url, payload, {
            headers: { "Content-Type": "application/json" },
        }));
        if (data.statusCode !== "00") {
            throw new common_1.BadRequestException(`Duitku error: ${data.statusMessage} (${data.statusCode})`);
        }
        if (!data.qrString) {
            throw new common_1.BadRequestException("qrString not returned. Ensure paymentMethod is a QRIS method enabled in your merchant.");
        }
        return {
            merchantOrderId: input.merchantOrderId,
            reference: data.reference,
            amount: data.amount,
            qrString: data.qrString,
            expiresInMinutes: 10,
        };
    }
    async checkStatus(merchantOrderId) {
        this.assertConfig();
        const url = `${this.baseUrl}/webapi/api/merchant/transactionStatus`;
        const payload = {
            merchantCode: this.merchantCode,
            merchantOrderId,
            signature: this.signStatus(merchantOrderId),
        };
        const { data } = await (0, rxjs_1.firstValueFrom)(this.http.post(url, payload, {
            headers: { "Content-Type": "application/json" },
        }));
        return data;
    }
    /**
     * Callback signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
     */
    verifyCallbackSignature(body) {
        this.assertConfig();
        const { merchantCode, amount, merchantOrderId, signature } = body || {};
        if (!merchantCode || !amount || !merchantOrderId || !signature)
            return false;
        const calc = crypto
            .createHash("md5")
            .update(`${merchantCode}${amount}${merchantOrderId}${this.apiKey}`)
            .digest("hex");
        return calc === signature;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], PaymentsService);
