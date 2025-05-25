import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NftsService } from './nfts.service';
import { NftsController } from './nfts.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NFT, NFTSchema } from './schemas/nft.schema';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { Sale, SaleSchema } from './schemas/sale.schema';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { BlockchainIntegrationService } from './services/blockchain-integration.service';
import { BlockchainIntegrationController } from './controllers/blockchain-integration.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: NFT.name, schema: NFTSchema },
      { name: Collection.name, schema: CollectionSchema },
      { name: Sale.name, schema: SaleSchema },
    ]),
    BlockchainModule,
  ],
  controllers: [
    NftsController,
    CollectionsController,
    SalesController,
    BlockchainIntegrationController,
  ],
  providers: [
    NftsService,
    CollectionsService,
    SalesService,
    BlockchainIntegrationService,
  ],
  exports: [
    NftsService,
    CollectionsService,
    SalesService,
    BlockchainIntegrationService,
  ],
})
export class NftsModule {}
