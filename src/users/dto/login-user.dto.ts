import { IsEmail, IsOptional, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  password: string;
}
