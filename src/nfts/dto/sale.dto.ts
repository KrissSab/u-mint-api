import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleStatus, SaleType } from '../schemas/sale.schema';

export class CreateSaleDto {
  @IsString()
  nftId: string;

  @IsString()
  collectionId: string;

  @IsEnum(SaleType)
  type: SaleType;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endTime?: Date;
}

export class PlaceBidDto {
  @IsString()
  saleId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class UpdateSaleDto {
  @IsEnum(SaleStatus)
  @IsOptional()
  status?: SaleStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  endTime?: Date;
}

export class BuySaleDto {
  @IsString()
  saleId: string;

  @IsString()
  @IsOptional()
  transactionHash?: string;
}
