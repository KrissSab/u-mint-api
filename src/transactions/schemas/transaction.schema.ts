import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

// Linked list node: each record contains a hash of the previous record,
// forming a tamper-evident chain (mirrors blockchain structure).
@Schema({ timestamps: true })
export class Transaction {
  // Hash of the previous Transaction record (null for genesis record)
  @Prop({ default: null })
  prev_hash: string | null;

  // SHA-256 hash of this record's content
  @Prop({ required: true })
  hash: string;

  // AES-encrypted transaction payload stored as base64
  @Prop({ required: true })
  encrypted_data: string;

  // Version identifier of the encryption key used
  @Prop({ required: true, default: 'v1' })
  key_version: string;

  @Prop({ default: Date.now })
  created_at: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
