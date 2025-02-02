import { Module } from '@nestjs/common';
import { NftsService } from './nfts.service';
import { NftsController } from './nfts.controller';

@Module({
  controllers: [NftsController],
  providers: [NftsService],
})
export class NftsModule {}
