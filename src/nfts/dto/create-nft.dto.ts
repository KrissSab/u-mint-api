import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateNftDto {
  @IsString()
  tokenId: string;

  @IsString()
  contractAddress: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  blockchain?: string;

  @IsString()
  @IsOptional()
  collectionId?: string;
}
