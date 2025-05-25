import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Wallet, WalletSchema } from './schemas/wallet.schema';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Wallet.name, schema: WalletSchema },
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
