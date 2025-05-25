export class UserCreatedEvent {
  constructor(
    public readonly email: string,
    public readonly username: string,
  ) {}
}

export class WalletAddedEvent {
  constructor(
    public readonly email: string,
    public readonly walletType: string,
    public readonly walletAddress: string,
  ) {}
}

export class NFTAddedEvent {
  constructor(
    public readonly email: string,
    public readonly nftName: string,
    public readonly contractAddress: string,
    public readonly tokenId: string,
    public readonly imageUrl?: string,
  ) {}
}

export class PasswordResetRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly resetToken: string,
  ) {}
}

export class EmailVerificationEvent {
  constructor(
    public readonly email: string,
    public readonly verificationCode: string,
  ) {}
}
