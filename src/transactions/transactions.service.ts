import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import {
  Transaction,
  TransactionDocument,
} from './schemas/transaction.schema';
import {
  ReencryptionLog,
  ReencryptionLogDocument,
} from './schemas/reencryption-log.schema';

const CURRENT_KEY_VERSION = 'v1';
// In production this key would come from a secure vault (AWS KMS, HashiCorp Vault, etc.)
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.TRANSACTION_ENCRYPTION_KEY || 'u-mint-default-key')
  .digest();

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(ReencryptionLog.name)
    private reencryptionLogModel: Model<ReencryptionLogDocument>,
  ) {}

  async recordTransaction(payload: Record<string, any>): Promise<Transaction> {
    const encrypted = this.encrypt(JSON.stringify(payload));

    const lastTx = await this.transactionModel
      .findOne()
      .sort({ created_at: -1 });

    const prev_hash = lastTx ? lastTx.hash : null;
    const hash = this.computeHash(prev_hash, encrypted);

    const tx = new this.transactionModel({
      prev_hash,
      hash,
      encrypted_data: encrypted,
      key_version: CURRENT_KEY_VERSION,
    });

    return tx.save();
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionModel.find().sort({ created_at: 1 });
  }

  async findOne(id: string): Promise<Transaction> {
    return this.transactionModel.findById(id);
  }

  async reencryptAll(newKeyVersion: string, reason: string): Promise<void> {
    const transactions = await this.transactionModel.find({
      key_version: CURRENT_KEY_VERSION,
    });

    for (const tx of transactions) {
      const decrypted = this.decrypt(tx.encrypted_data);
      const reencrypted = this.encrypt(decrypted, newKeyVersion);
      const newHash = this.computeHash(tx.prev_hash, reencrypted);

      const lastLog = await this.reencryptionLogModel
        .findOne({ tx_id: tx._id })
        .sort({ reencrypted_at: -1 });

      const newLog = await new this.reencryptionLogModel({
        tx_id: tx._id,
        key_version_old: tx.key_version,
        key_version_new: newKeyVersion,
        reason,
        prev_log_id: lastLog ? lastLog._id : null,
        next_log_id: null,
      }).save();

      if (lastLog) {
        await this.reencryptionLogModel.findByIdAndUpdate(lastLog._id, {
          next_log_id: newLog._id,
        });
      }

      await this.transactionModel.findByIdAndUpdate(tx._id, {
        encrypted_data: reencrypted,
        hash: newHash,
        key_version: newKeyVersion,
      });
    }
  }

  async getReencryptionLogs(): Promise<ReencryptionLog[]> {
    return this.reencryptionLogModel
      .find()
      .populate('tx_id')
      .sort({ reencrypted_at: -1 });
  }

  private encrypt(data: string, _keyVersion?: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);
    return iv.toString('hex') + ':' + encrypted.toString('base64');
  }

  private decrypt(encryptedData: string): string {
    const [ivHex, data] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private computeHash(prevHash: string | null, data: string): string {
    return crypto
      .createHash('sha256')
      .update((prevHash ?? '') + data)
      .digest('hex');
  }
}
