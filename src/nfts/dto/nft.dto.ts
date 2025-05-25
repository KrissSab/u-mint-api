import { IsObject, IsOptional, IsString } from 'class-validator';

export class NFTDto {
  @IsString()
  tokenId: string;

  @IsString()
  contractAddress: string;

  @IsString()
  name: string;

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
  blockchain: string;
}

export class AddNFTDto {
  @IsString()
  userId: string;

  tokenId: string;

  contractAddress: string;

  name: string;

  description?: string;

  imageUrl?: string;

  metadata?: Record<string, any>;

  blockchain: string;
}
