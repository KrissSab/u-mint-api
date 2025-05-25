import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { NFT, NFTDocument } from '../schemas/nft.schema';
import { Collection, CollectionDocument } from '../schemas/collection.schema';
import {
  Sale,
  SaleDocument,
  SaleStatus,
  SaleType,
} from '../schemas/sale.schema';

@Injectable()
export class BlockchainIntegrationService {
  private readonly logger = new Logger(BlockchainIntegrationService.name);

  constructor(
    private readonly blockchainService: BlockchainService,
    @InjectModel(NFT.name) private nftModel: Model<NFTDocument>,
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
  ) {}

  async mintNFTOnBlockchain(
    userId: string,
    nftId: string,
  ): Promise<{ tokenId: string; txHash: string }> {
    try {
      // Get NFT from database
      const nft = await this.nftModel.findById(nftId);
      if (!nft) {
        throw new Error(`NFT with ID ${nftId} not found`);
      }

      // Mint NFT on blockchain
      const result = await this.blockchainService.mintNFT(nft.userId);

      // Update NFT with blockchain tokenId
      await this.nftModel.findByIdAndUpdate(nftId, {
        tokenId: result.tokenId,
        contractAddress: this.blockchainService.getNFTAddress(),
      });

      return result;
    } catch (error) {
      this.logger.error(`Error minting NFT on blockchain: ${error.message}`);
      throw error;
    }
  }

  async createCollectionOnBlockchain(collectionId: string): Promise<string> {
    try {
      // Get collection from database
      const collection = await this.collectionModel.findById(collectionId);
      if (!collection) {
        throw new Error(`Collection with ID ${collectionId} not found`);
      }

      // Set base URI for collection
      // This would typically point to your API endpoint that serves metadata
      const baseUri = `${process.env.API_BASE_URL}/api/collections/${collectionId}/metadata/`;
      const txHash = await this.blockchainService.setBaseURI(baseUri);

      return txHash;
    } catch (error) {
      this.logger.error(
        `Error creating collection on blockchain: ${error.message}`,
      );
      throw error;
    }
  }

  async listNFTForSale(saleId: string): Promise<string> {
    try {
      // Get sale from database
      const sale = await this.saleModel.findById(saleId);
      if (!sale) {
        throw new Error(`Sale with ID ${saleId} not found`);
      }

      // Get NFT details
      const nft = await this.nftModel.findById(sale.nftId);
      if (!nft) {
        throw new Error(`NFT with ID ${sale.nftId} not found`);
      }

      // List item on marketplace
      const txHash = await this.blockchainService.listItem(
        nft.contractAddress,
        nft.tokenId,
        sale.price.toString(),
      );

      // Update sale with transaction hash
      await this.saleModel.findByIdAndUpdate(saleId, {
        transactionHash: txHash,
      });

      return txHash;
    } catch (error) {
      this.logger.error(
        `Error listing NFT for sale on blockchain: ${error.message}`,
      );
      throw error;
    }
  }

  async buyNFT(saleId: string, buyerId: string): Promise<string> {
    try {
      // Get sale from database
      const sale = await this.saleModel.findById(saleId);
      if (!sale) {
        throw new Error(`Sale with ID ${saleId} not found`);
      }

      // Get NFT details
      const nft = await this.nftModel.findById(sale.nftId);
      if (!nft) {
        throw new Error(`NFT with ID ${sale.nftId} not found`);
      }

      // Buy item from marketplace
      const txHash = await this.blockchainService.buyItem(
        nft.contractAddress,
        nft.tokenId,
        sale.price.toString(),
      );

      // Update sale with transaction hash and status
      await this.saleModel.findByIdAndUpdate(saleId, {
        transactionHash: txHash,
        status: SaleStatus.SOLD,
        buyerId,
        soldAt: new Date(),
      });

      // Update NFT ownership
      await this.nftModel.findByIdAndUpdate(sale.nftId, {
        userId: buyerId,
        isForSale: false,
        currentSaleId: null,
      });

      return txHash;
    } catch (error) {
      this.logger.error(`Error buying NFT on blockchain: ${error.message}`);
      throw error;
    }
  }

  async cancelSale(saleId: string): Promise<string> {
    try {
      // Get sale from database
      const sale = await this.saleModel.findById(saleId);
      if (!sale) {
        throw new Error(`Sale with ID ${saleId} not found`);
      }

      // Get NFT details
      const nft = await this.nftModel.findById(sale.nftId);
      if (!nft) {
        throw new Error(`NFT with ID ${sale.nftId} not found`);
      }

      // Cancel listing on marketplace
      const txHash = await this.blockchainService.cancelListing(
        nft.contractAddress,
        nft.tokenId,
      );

      // Update sale with transaction hash and status
      await this.saleModel.findByIdAndUpdate(saleId, {
        transactionHash: txHash,
        status: SaleStatus.CANCELLED,
      });

      // Update NFT
      await this.nftModel.findByIdAndUpdate(sale.nftId, {
        isForSale: false,
        currentSaleId: null,
      });

      return txHash;
    } catch (error) {
      this.logger.error(
        `Error cancelling sale on blockchain: ${error.message}`,
      );
      throw error;
    }
  }

  async syncNFTWithBlockchain(nftId: string): Promise<void> {
    try {
      // Get NFT from database
      const nft = await this.nftModel.findById(nftId);
      if (!nft || !nft.tokenId || !nft.contractAddress) {
        throw new Error(
          `NFT with ID ${nftId} not found or missing blockchain data`,
        );
      }

      // Get owner from blockchain
      const owner = await this.blockchainService.getOwnerOf(nft.tokenId);

      // Check if NFT is listed for sale
      const listing = await this.blockchainService.getListing(
        nft.contractAddress,
        nft.tokenId,
      );

      // Update NFT based on blockchain data
      const updates: any = {};

      // If there's a valid listing
      if (
        listing &&
        listing.seller !== '0x0000000000000000000000000000000000000000'
      ) {
        updates.isForSale = true;
        updates.price = parseFloat(listing.price);

        // Check if we need to create a sale in our database
        const existingSale = await this.saleModel.findOne({
          nftId: nft._id,
          status: SaleStatus.ACTIVE,
        });

        if (!existingSale) {
          // Create new sale record
          const newSale = new this.saleModel({
            nftId: nft._id,
            collectionId: nft.collectionId,
            sellerId: nft.userId,
            type: SaleType.FIXED_PRICE,
            price: parseFloat(listing.price),
            currency: 'ETH',
            status: SaleStatus.ACTIVE,
          });

          const savedSale = await newSale.save();
          updates.currentSaleId = savedSale._id;
        }
      } else {
        updates.isForSale = false;
        updates.currentSaleId = null;
      }

      // Update NFT
      await this.nftModel.findByIdAndUpdate(nftId, updates);
    } catch (error) {
      this.logger.error(`Error syncing NFT with blockchain: ${error.message}`);
      throw error;
    }
  }
}
