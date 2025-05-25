import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  @Prop()
  metadata: Record<string, any>;

  @Prop()
  blockchain: string; // 'ethereum', 'solana', etc.

  @Prop({ required: true })
  userId: string;
}

export const NFTSchema = SchemaFactory.createForClass(NFT);
