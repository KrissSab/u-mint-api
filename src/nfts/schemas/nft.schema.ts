import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type NFTDocument = HydratedDocument<NFT>;

@Schema({ timestamps: true })
export class NFT {
  @Prop({ required: true })
  tokenId: string;

  @Prop({ required: true })
  contractAddress: string;

  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop()
  imageUrl: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata: Record<string, any>;

  @Prop()
  blockchain: string; // 'ethereum', 'solana', etc.

  @Prop({ required: true })
  userId: string;

  @Prop()
  collectionId: string;

  @Prop({ default: false })
  isForSale: boolean;

  @Prop()
  currentSaleId: string;

  @Prop({ default: 0 })
  price: number;

  @Prop()
  currency: string;
}

export const NFTSchema = SchemaFactory.createForClass(NFT);
