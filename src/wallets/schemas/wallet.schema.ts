import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ required: true })
  type: string; // 'phantom', 'coinbase', or other wallet types

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  userId: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
