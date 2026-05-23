import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { ConsensusService } from '../../consensus/consensus.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { OperationType } from '../../consensus/dto/validate.dto';
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
    private readonly consensusService: ConsensusService,
    private readonly transactionsService: TransactionsService,
    @InjectModel(NFT.name) private nftModel: Model<NFTDocument>,
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
  ) {}

  async mintNFTOnBlockchain(
    userId: string,
    nftId: string,
  ): Promise<{ tokenId: string; txHash: string; consensus: any }> {
    const nft = await this.nftModel.findById(nftId);
    if (!nft) throw new BadRequestException(`NFT ${nftId} not found`);

    // --- CONSENSUS PHASE ---
    const tokenId = Date.now().toString();
    const consensusResult = await this.consensusService.requestConsensus({
      operation: OperationType.MINT,
      tokenId,
      nftId,
      userId,
    });

    if (!consensusResult.consensus) {
      throw new BadRequestException(
        `Consensus rejected mint: ${consensusResult.approvedVotes}/${consensusResult.totalNodes} votes`,
      );
    }

    // --- BLOCKCHAIN PHASE ---
    const result = await this.blockchainService.mintNFT(userId);

    await this.nftModel.findByIdAndUpdate(nftId, {
      tokenId: result.tokenId,
      contractAddress: this.blockchainService.getPlatformAddress(),
    });

    // --- AUDIT LOG ---
    await this.transactionsService.recordTransaction({
      operation: 'mint',
      nftId,
      userId,
      tokenId: result.tokenId,
      txHash: result.txHash,
      consensus: consensusResult,
    });

    return { ...result, consensus: consensusResult };
  }

  async listNFTForSale(
    saleId: string,
    userId: string,
  ): Promise<{ txHash: string; consensus: any }> {
    const sale = await this.saleModel.findById(saleId);
    if (!sale) throw new BadRequestException(`Sale ${saleId} not found`);

    const nft = await this.nftModel.findById(sale.nftId);
    if (!nft) throw new BadRequestException(`NFT ${sale.nftId} not found`);

    // --- CONSENSUS PHASE ---
    const consensusResult = await this.consensusService.requestConsensus({
      operation: OperationType.LIST,
      tokenId: nft.tokenId,
      nftId: nft._id.toString(),
      userId,
      price: sale.price,
    });

    if (!consensusResult.consensus) {
      throw new BadRequestException(
        `Consensus rejected listing: ${consensusResult.approvedVotes}/${consensusResult.totalNodes} votes`,
      );
    }

    // --- BLOCKCHAIN PHASE ---
    const txHash = await this.blockchainService.listItem(
      nft.tokenId,
      sale.price.toString(),
    );

    await this.saleModel.findByIdAndUpdate(saleId, { transactionHash: txHash });

    // --- AUDIT LOG ---
    await this.transactionsService.recordTransaction({
      operation: 'list',
      nftId: nft._id.toString(),
      saleId,
      userId,
      price: sale.price,
      txHash,
      consensus: consensusResult,
    });

    return { txHash, consensus: consensusResult };
  }

  async buyNFT(
    saleId: string,
    buyerId: string,
  ): Promise<{ txHash: string; consensus: any }> {
    const sale = await this.saleModel.findById(saleId);
    if (!sale) throw new BadRequestException(`Sale ${saleId} not found`);

    const nft = await this.nftModel.findById(sale.nftId);
    if (!nft) throw new BadRequestException(`NFT ${sale.nftId} not found`);

    // --- CONSENSUS PHASE ---
    const consensusResult = await this.consensusService.requestConsensus({
      operation: OperationType.BUY,
      tokenId: nft.tokenId,
      nftId: nft._id.toString(),
      userId: buyerId,
      saleId,
    });

    if (!consensusResult.consensus) {
      throw new BadRequestException(
        `Consensus rejected purchase: ${consensusResult.approvedVotes}/${consensusResult.totalNodes} votes`,
      );
    }

    // --- BLOCKCHAIN PHASE ---
    const txHash = await this.blockchainService.buyItem(
      nft.tokenId,
      sale.price.toString(),
    );

    await this.saleModel.findByIdAndUpdate(saleId, {
      transactionHash: txHash,
      status: SaleStatus.SOLD,
      buyerId,
      soldAt: new Date(),
    });

    await this.nftModel.findByIdAndUpdate(sale.nftId, {
      userId: buyerId,
      isForSale: false,
      currentSaleId: null,
    });

    // --- AUDIT LOG ---
    await this.transactionsService.recordTransaction({
      operation: 'buy',
      nftId: nft._id.toString(),
      saleId,
      buyerId,
      price: sale.price,
      txHash,
      consensus: consensusResult,
    });

    return { txHash, consensus: consensusResult };
  }

  async cancelSale(
    saleId: string,
    userId?: string,
  ): Promise<{ txHash: string; consensus: any }> {
    const sale = await this.saleModel.findById(saleId);
    if (!sale) throw new BadRequestException(`Sale ${saleId} not found`);

    const nft = await this.nftModel.findById(sale.nftId);
    if (!nft) throw new BadRequestException(`NFT ${sale.nftId} not found`);

    // --- CONSENSUS PHASE ---
    const consensusResult = await this.consensusService.requestConsensus({
      operation: OperationType.CANCEL,
      tokenId: nft.tokenId,
      nftId: nft._id.toString(),
      userId: userId || sale.sellerId,
      saleId,
    });

    if (!consensusResult.consensus) {
      throw new BadRequestException(
        `Consensus rejected cancel: ${consensusResult.approvedVotes}/${consensusResult.totalNodes} votes`,
      );
    }

    // --- BLOCKCHAIN PHASE ---
    const txHash = await this.blockchainService.cancelListing(nft.tokenId);

    await this.saleModel.findByIdAndUpdate(saleId, {
      transactionHash: txHash,
      status: SaleStatus.CANCELLED,
    });

    await this.nftModel.findByIdAndUpdate(sale.nftId, {
      isForSale: false,
      currentSaleId: null,
    });

    // --- AUDIT LOG ---
    await this.transactionsService.recordTransaction({
      operation: 'cancel',
      nftId: nft._id.toString(),
      saleId,
      userId: userId || sale.sellerId,
      txHash,
      consensus: consensusResult,
    });

    return { txHash, consensus: consensusResult };
  }

  async syncNFTWithBlockchain(nftId: string): Promise<void> {
    const nft = await this.nftModel.findById(nftId);
    if (!nft || !nft.tokenId) {
      throw new BadRequestException(
        `NFT ${nftId} not found or missing tokenId`,
      );
    }

    const listing = await this.blockchainService.getListing(nft.tokenId);
    const updates: any = {};

    if (listing && listing.isActive) {
      updates.isForSale = true;
      updates.price = parseFloat(listing.price);

      const existingSale = await this.saleModel.findOne({
        nftId: nft._id,
        status: SaleStatus.ACTIVE,
      });

      if (!existingSale) {
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

    await this.nftModel.findByIdAndUpdate(nftId, updates);
  }
}
