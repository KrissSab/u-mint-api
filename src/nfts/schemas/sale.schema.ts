import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type SaleDocument = HydratedDocument<Sale>;

export enum SaleStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum SaleType {
  FIXED_PRICE = 'fixed_price',
  AUCTION = 'auction',
}

@Schema({ timestamps: true })
export class Sale {
  @Prop({ required: true })
  nftId: string;

  @Prop({ required: true })
  collectionId: string;

  @Prop({ required: true })
  sellerId: string;

  @Prop()
  buyerId: string;

  @Prop({ required: true, type: String, enum: SaleType })
  type: SaleType;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop()
  currency: string;

  @Prop({ type: String, enum: SaleStatus, default: SaleStatus.ACTIVE })
  status: SaleStatus;

  @Prop()
  endTime: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  bids: Array<{
    bidderId: string;
    amount: number;
    timestamp: Date;
  }>;

  @Prop()
  transactionHash: string;

  @Prop()
  soldAt: Date;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
