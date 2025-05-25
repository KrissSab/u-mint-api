import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type CollectionDocument = HydratedDocument<Collection>;

@Schema({ timestamps: true })
export class Collection {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  symbol: string;

  @Prop({ required: true })
  creatorId: string;

  @Prop()
  bannerImage: string;

  @Prop()
  profileImage: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  royalties: {
    address: string;
    percentage: number;
  };

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: 0 })
  totalItems: number;

  @Prop({ default: 0 })
  totalVolume: number;

  @Prop({ default: 0 })
  floorPrice: number;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: MongooseSchema.Types.Mixed })
  socialLinks: Record<string, string>;

  @Prop({ default: false })
  isOnSale: boolean;
}

export const CollectionSchema = SchemaFactory.createForClass(Collection);
