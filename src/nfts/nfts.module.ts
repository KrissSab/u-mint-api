import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schema imports
import { User, UserSchema } from '../users/schemas/user.schema';
import { NFT, NFTSchema } from './schemas/nft.schema';
import { Collection, CollectionSchema } from './schemas/collection.schema';
import { Sale, SaleSchema } from './schemas/sale.schema';

// Service imports
import { NftsService } from './services/nfts.service';
import { CollectionsService } from './services/collections.service';
import { SalesService } from './services/sales.service';
import { BlockchainIntegrationService } from './services/blockchain-integration.service';

// Controller imports
import { NftsController } from './controllers/nfts.controller';
import { CollectionsController } from './controllers/collections.controller';
import { SalesController } from './controllers/sales.controller';
import { BlockchainIntegrationController } from './controllers/blockchain-integration.controller';

// Module imports
import { BlockchainModule } from '../blockchain/blockchain.module';

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
