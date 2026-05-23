import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsensusService } from './consensus.service';
import { ConsensusController } from './consensus.controller';
import { NFT, NFTSchema } from '../nfts/schemas/nft.schema';
import { Sale, SaleSchema } from '../nfts/schemas/sale.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NFT.name, schema: NFTSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
  ],
  controllers: [ConsensusController],
  providers: [ConsensusService],
  exports: [ConsensusService],
})
export class ConsensusModule {}
