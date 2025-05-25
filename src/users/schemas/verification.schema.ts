import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VerificationDocument = HydratedDocument<Verification>;

@Schema({ timestamps: true })
export class Verification {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ required: true, default: Date.now, expires: 600 }) // TTL: 10 minutes
  createdAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);
