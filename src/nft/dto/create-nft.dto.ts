import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateNftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @IsUrl()
  @IsOptional()
  externalUrl?: string;

  @IsString()
  @IsNotEmpty()
  contractAddress: string;

  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @IsOptional()
  metadata?: any;
}
