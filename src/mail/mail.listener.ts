import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from './mail.service';
import {
  EmailVerificationEvent,
  NFTAddedEvent,
  PasswordResetRequestedEvent,
  UserCreatedEvent,
  WalletAddedEvent,
} from './mail.events';

@Injectable()
export class MailListener {
  constructor(private readonly mailService: MailService) {}

  @OnEvent('user.created')
  handleUserCreatedEvent(event: UserCreatedEvent) {
    this.mailService
      .sendWelcomeEmail(event.email, event.username)
      .catch(error => console.error('Failed to send welcome email:', error));
  }

  @OnEvent('email.verification')
  handleEmailVerificationEvent(event: EmailVerificationEvent) {
    this.mailService
      .sendVerificationCode(event.email, event.verificationCode)
      .catch(error =>
        console.error('Failed to send verification code:', error),
      );
  }

  @OnEvent('wallet.added')
  handleWalletAddedEvent(event: WalletAddedEvent) {
    this.mailService
      .sendWalletAddedEmail(event.email, event.walletType, event.walletAddress)
      .catch(error =>
        console.error('Failed to send wallet added email:', error),
      );
  }

  @OnEvent('nft.added')
  handleNFTAddedEvent(event: NFTAddedEvent) {
    this.mailService
      .sendNFTPurchaseConfirmation(
        event.email,
        event.nftName,
        event.contractAddress,
        event.tokenId,
        event.imageUrl,
      )
      .catch(error => console.error('Failed to send NFT added email:', error));
  }

  @OnEvent('password.reset.requested')
  handlePasswordResetEvent(event: PasswordResetRequestedEvent) {
    this.mailService
      .sendPasswordResetEmail(event.email, event.resetToken)
      .catch(error =>
        console.error('Failed to send password reset email:', error),
      );
  }
}
