// nft.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NftDocument = Nft & Document;

@Schema({ timestamps: true })
export class Nft {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  externalUrl?: string;

  @Prop({ required: true })
  contractAddress: string;

  @Prop({ required: true })
  tokenId: string;

  @Prop({ type: Object })
  metadata?: any;
}

export const NftSchema = SchemaFactory.createForClass(Nft);
