import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import {
  Transaction,
  TransactionSchema,
} from './schemas/transaction.schema';
import {
  ReencryptionLog,
  ReencryptionLogSchema,
} from './schemas/reencryption-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: ReencryptionLog.name, schema: ReencryptionLogSchema },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
