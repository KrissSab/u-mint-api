import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { NftsModule } from './nfts/nfts.module';
import { MailModule } from './mail/mail.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ConsensusModule } from './consensus/consensus.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    EventEmitterModule.forRoot(),
    UsersModule,
    WalletsModule,
    NftsModule,
    MailModule,
    BlockchainModule,
    TransactionsModule,
    ConsensusModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
