import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export interface MailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: any;
  }>;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const appPassword = this.configService.get<string>('GOOGLE_APP_PASSWORD');

    if (!emailUser || !appPassword) {
      this.logger.error('Missing email configuration');
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: appPassword,
      },
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error(
          `Failed to initialize email transporter: ${error.message}`,
        );
      } else {
        this.logger.log('Email transporter initialized');
      }
    });
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Email transporter not initialized');
      return false;
    }

    try {
      const mailOptions = {
        from: this.configService.get<string>('EMAIL_USER'),
        ...options,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  async sendVerificationCode(to: string, code: string): Promise<boolean> {
    const subject = 'Your U-Mint Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Email Verification</h1>
        <p>Thank you for registering with U-Mint!</p>
        <p>Your verification code is:</p>
        <div style="padding: 10px; background-color: #f2f2f2; border-radius: 5px; font-size: 24px; text-align: center; letter-spacing: 5px; font-weight: bold; margin: 20px 0;">
          ${code}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <p>Best regards,<br>The U-Mint Team</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    const subject = 'Welcome to U-Mint Crypto Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to U-Mint!</h1>
        <p>Hi ${username},</p>
        <p>Thank you for joining U-Mint, your crypto and NFT management platform.</p>
        <p>With U-Mint, you can:</p>
        <ul>
          <li>Manage multiple crypto wallets in one place</li>
          <li>Track your NFT collection</li>
          <li>Stay updated on market trends</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The U-Mint Team</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
  ): Promise<boolean> {
    const subject = 'Password Reset Request';
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset</h1>
        <p>You've requested a password reset for your U-Mint account.</p>
        <p>Please click the link below to reset your password:</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </p>
        <p>If you didn't request this reset, please ignore this email or contact support if you have concerns.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>The U-Mint Team</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendWalletAddedEmail(
    to: string,
    walletType: string,
    walletAddress: string,
  ): Promise<boolean> {
    const subject = 'New Wallet Added to Your Account';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">New Wallet Added</h1>
        <p>A new ${walletType} wallet has been added to your U-Mint account.</p>
        <p><strong>Wallet Address:</strong> ${walletAddress}</p>
        <p>If you did not authorize this action, please contact our support team immediately.</p>
        <p>Best regards,<br>The U-Mint Team</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendNFTPurchaseConfirmation(
    to: string,
    nftName: string,
    contractAddress: string,
    tokenId: string,
    imageUrl?: string,
  ): Promise<boolean> {
    const subject = 'NFT Purchase Confirmation';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">NFT Purchase Confirmation</h1>
        <p>Congratulations on your new NFT purchase!</p>
        <p><strong>NFT Name:</strong> ${nftName}</p>
        <p><strong>Contract Address:</strong> ${contractAddress}</p>
        <p><strong>Token ID:</strong> ${tokenId}</p>
        ${imageUrl ? `<p><img src="${imageUrl}" alt="${nftName}" style="max-width: 100%; max-height: 300px;"/></p>` : ''}
        <p>Your NFT has been added to your U-Mint account.</p>
        <p>Best regards,<br>The U-Mint Team</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }
}
