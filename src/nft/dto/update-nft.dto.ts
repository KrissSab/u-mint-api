import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateNftDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsUrl()
  @IsOptional()
  externalUrl?: string;

  @IsString()
  @IsOptional()
  contractAddress?: string;

  @IsString()
  @IsOptional()
  tokenId?: string;

  @IsOptional()
  metadata?: any;
}
