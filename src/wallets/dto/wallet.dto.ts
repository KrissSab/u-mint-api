import { IsString } from 'class-validator';
import { IsCryptoWallet } from '../wallets.validator';

export class WalletDto {
  @IsString()
  type: string;

  @IsCryptoWallet()
  address: string;
}

export class AddWalletDto {
  @IsString()
  userId: string;

  @IsString()
  type: string;

  @IsCryptoWallet()
  address: string;
}

export class RemoveWalletDto {
  @IsString()
  userId: string;

  @IsCryptoWallet()
  address: string;
}
