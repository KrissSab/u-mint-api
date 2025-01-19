import {
  IsBtcAddress,
  IsEmail,
  IsEthereumAddress,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { IsCryptoWallet } from '../helpers/wallet.validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsCryptoWallet()
  wallet: string;
}
