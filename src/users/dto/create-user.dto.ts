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
  @IsOptional()
  @ValidateIf(o => o.email !== null && o.email !== undefined && o.email !== '')
  email?: string;

  @IsStrongPassword()
  @ValidateIf(o => !o.wallet)
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WalletDto)
  wallet?: WalletDto;
}
