import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsStrongPassword,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WalletDto } from '../../wallets/dto/wallet.dto';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsEmail()
  @ValidateIf(o => !o.wallet)
  @IsOptional()
  email?: string;

  @IsStrongPassword()
  @ValidateIf(o => !o.wallet)
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WalletDto)
  wallet?: WalletDto;
}
