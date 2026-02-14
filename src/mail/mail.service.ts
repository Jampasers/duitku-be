
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // Configure transporter with your email service credentials
    // For production, use environment variables
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // or your preferred service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendProductEmail(email: string, productDetails: any, orderId: string) {
    try {
      const mailOptions = {
        from: `"DankaStur Store" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Order Confirmation #${orderId} - DankaStur`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h1 style="color: #00bcd4;">Thank you for your order!</h1>
            <p>Your payment for order <strong>#${orderId}</strong> has been confirmed.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Product Details:</h3>
              <p><strong>Name:</strong> ${productDetails.name}</p>
              <p><strong>Description:</strong> ${productDetails.description}</p>
              <p><strong>Price:</strong> Rp${parseInt(productDetails.price).toLocaleString('id-ID')}</p>
            </div>

            <p>Your digital product is ready for download/access:</p>
            <div style="background-color: #e0f7fa; padding: 15px; border-radius: 5px; border: 1px solid #00acc1;">
              <strong>${productDetails.content || "Access instructions will be sent separately."}</strong>
            </div>

            <p style="margin-top: 30px; font-size: 12px; color: #777;">
              If you have any questions, please reply to this email.
            </p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error(`Error sending email to ${email}:`, error);
      // Don't throw to avoid crashing the request, but log it
      return null;
    }
  }
}
