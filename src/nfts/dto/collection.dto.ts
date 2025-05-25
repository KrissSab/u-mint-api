import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RoyaltyDto {
  @IsString()
  address: string;

  @IsNumber()
  @Min(0)
  @Max(25)
  percentage: number;
}

export class CreateCollectionDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsString()
  @IsOptional()
  profileImage?: string;

  @IsObject()
  @IsOptional()
  royalties?: RoyaltyDto;

  @IsArray()
  @IsOptional()
  categories?: string[];

  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;
}

export class UpdateCollectionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsOptional()
  bannerImage?: string;

  @IsString()
  @IsOptional()
  profileImage?: string;

  @IsObject()
  @IsOptional()
  royalties?: RoyaltyDto;

  @IsArray()
  @IsOptional()
  categories?: string[];

  @IsObject()
  @IsOptional()
  socialLinks?: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  isOnSale?: boolean;
}
