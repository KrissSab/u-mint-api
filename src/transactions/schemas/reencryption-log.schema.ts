import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type ReencryptionLogDocument = HydratedDocument<ReencryptionLog>;

// Doubly linked list node: each entry records a key-rotation event.
// prev_log_id / next_log_id allow traversal in both directions,
// giving a full audit trail of every re-encryption performed on a transaction.
@Schema()
export class ReencryptionLog {
  // Reference to the transaction that was re-encrypted
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Transaction', required: true })
  tx_id: string;

  // Key version before rotation
  @Prop({ required: true })
  key_version_old: string;

  // Key version after rotation
  @Prop({ required: true })
  key_version_new: string;

  // Timestamp of the re-encryption event
  @Prop({ default: Date.now })
  reencrypted_at: Date;

  // Human-readable reason for the key rotation (e.g. "Annual key rotation")
  @Prop()
  reason: string;

  // Previous log entry in the doubly linked list
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ReencryptionLog', default: null })
  prev_log_id: string | null;

  // Next log entry in the doubly linked list (updated when a successor is created)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ReencryptionLog', default: null })
  next_log_id: string | null;
}

export const ReencryptionLogSchema = SchemaFactory.createForClass(ReencryptionLog);
