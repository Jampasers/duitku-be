import { Injectable, BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import * as crypto from "crypto";

type DuitkuInquiryResponse = {
  merchantCode: string;
  reference: string;
  paymentUrl?: string;
  vaNumber?: string;
  qrString?: string;
  amount: string;
  statusCode: string;
  statusMessage: string;
};

type DuitkuStatusResponse = {
  merchantCode: string;
  amount: string;
  merchantOrderId: string;
  reference: string;
  statusCode: string;
  statusMessage: string;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly http: HttpService) {}

  private merchantCode = process.env.DUITKU_MERCHANT_CODE || "";
  private apiKey = process.env.DUITKU_API_KEY || "";
  private baseUrl = process.env.DUITKU_BASE_URL || "https://sandbox.duitku.com";
  private qrisMethod = process.env.DUITKU_QRIS_METHOD || "SP";

  private assertConfig() {
    if (!this.merchantCode)
      throw new BadRequestException("Missing DUITKU_MERCHANT_CODE in .env");
    if (!this.apiKey)
      throw new BadRequestException("Missing DUITKU_API_KEY in .env");
  }

  // Signature inquiry: MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
  private signInquiry(merchantOrderId: string, paymentAmount: number) {
    return crypto
      .createHash("md5")
      .update(
        `${this.merchantCode}${merchantOrderId}${paymentAmount}${this.apiKey}`,
      )
      .digest("hex");
  }

  // Signature check status: MD5(merchantCode + merchantOrderId + apiKey)
  private signStatus(merchantOrderId: string) {
    return crypto
      .createHash("md5")
      .update(`${this.merchantCode}${merchantOrderId}${this.apiKey}`)
      .digest("hex");
  }

  async createQrisInvoice(input: {
    merchantOrderId: string;
    amount: number;
    productDetails: string;
    customer: { name: string; email: string; phone?: string };
  }) {
    this.assertConfig();

    if (!input?.merchantOrderId)
      throw new BadRequestException("merchantOrderId required");
    if (!input?.amount || input.amount <= 0)
      throw new BadRequestException("amount must be > 0");
    if (!input?.productDetails)
      throw new BadRequestException("productDetails required");
    if (!input?.customer?.name || !input?.customer?.email)
      throw new BadRequestException(
        "customer.name and customer.email required",
      );

    const callbackUrl = `${process.env.BACKEND_BASE_URL || "http://localhost:4000"}/payments/duitku/callback`;
    const returnUrl = `${process.env.PUBLIC_APP_URL || "http://localhost:3000"}/payment/${encodeURIComponent(
      input.merchantOrderId,
    )}`;

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

    const { data } = await firstValueFrom(
      this.http.post<DuitkuInquiryResponse>(url, payload, {
        headers: { "Content-Type": "application/json" },
      }),
    );

    if (data.statusCode !== "00") {
      throw new BadRequestException(
        `Duitku error: ${data.statusMessage} (${data.statusCode})`,
      );
    }
    if (!data.qrString) {
      throw new BadRequestException(
        "qrString not returned. Ensure paymentMethod is a QRIS method enabled in your merchant.",
      );
    }

    return {
      merchantOrderId: input.merchantOrderId,
      reference: data.reference,
      amount: data.amount,
      qrString: data.qrString,
      expiresInMinutes: 10,
    };
  }

  async checkStatus(merchantOrderId: string) {
    this.assertConfig();

    const url = `${this.baseUrl}/webapi/api/merchant/transactionStatus`;
    const payload = {
      merchantCode: this.merchantCode,
      merchantOrderId,
      signature: this.signStatus(merchantOrderId),
    };

    const { data } = await firstValueFrom(
      this.http.post<DuitkuStatusResponse>(url, payload, {
        headers: { "Content-Type": "application/json" },
      }),
    );

    return data;
  }

  /**
   * Callback signature: MD5(merchantCode + amount + merchantOrderId + apiKey)
   */
  verifyCallbackSignature(body: any) {
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
}
