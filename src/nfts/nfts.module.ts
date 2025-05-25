import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NftsService } from './nfts.service';
import { NftsController } from './nfts.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NFT, NFTSchema } from './schemas/nft.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: NFT.name, schema: NFTSchema },
    ]),
  ],
  controllers: [NftsController],
  providers: [NftsService],
  exports: [NftsService],
})
export class NftsModule {}
