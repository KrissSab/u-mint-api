import {
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';
import { WalletDto } from '../../wallets/dto/wallet.dto';

export class RegisterUserDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsOptional()
  wallet?: WalletDto;
}

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(4, 4)
  code: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}
