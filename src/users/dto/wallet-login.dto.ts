import { IsString } from 'class-validator';
import { IsCryptoWallet } from '../../wallets/wallets.validator';

export class WalletLoginDto {
  @IsString()
  type: string;

  @IsCryptoWallet()
  address: string;
}
