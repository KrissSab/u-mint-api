import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UsersModule } from './users/users.module';
import { NftsModule } from './nfts/nfts.module';
import { WalletsModule } from './wallets/wallets.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    EventEmitterModule.forRoot(),
    UsersModule,
    NftsModule,
    WalletsModule,
    MailModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
