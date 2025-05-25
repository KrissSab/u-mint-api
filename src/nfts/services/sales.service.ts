import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Sale,
  SaleDocument,
  SaleStatus,
  SaleType,
} from '../schemas/sale.schema';
import { NFT, NFTDocument } from '../schemas/nft.schema';
import { Collection, CollectionDocument } from '../schemas/collection.schema';
import {
  CreateSaleDto,
  UpdateSaleDto,
  PlaceBidDto,
  BuySaleDto,
} from '../dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(NFT.name) private nftModel: Model<NFTDocument>,
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createSale(userId: string, createSaleDto: CreateSaleDto) {
    const { nftId, collectionId, type, price, currency, endTime } =
      createSaleDto;

    // Check if NFT exists and belongs to user
    const nft = await this.nftModel.findById(nftId);
    if (!nft) {
      throw new NotFoundException(`NFT with ID ${nftId} not found`);
    }

    if (nft.userId !== userId) {
      throw new BadRequestException('You do not own this NFT');
    }

    if (nft.isForSale) {
      throw new BadRequestException('This NFT is already for sale');
    }

    // Check if collection exists
    const collection = await this.collectionModel.findById(collectionId);
    if (!collection) {
      throw new NotFoundException(
        `Collection with ID ${collectionId} not found`,
      );
    }

    // Create sale
    const newSale = new this.saleModel({
      nftId,
      collectionId,
      sellerId: userId,
      type,
      price,
      currency: currency || 'ETH',
      status: SaleStatus.ACTIVE,
      endTime:
        type === SaleType.AUCTION
          ? endTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
      bids: [],
    });

    const savedSale = await newSale.save();

    // Update NFT
    nft.isForSale = true;
    nft.currentSaleId = savedSale._id.toString();
    nft.price = price;
    nft.currency = savedSale.currency;
    await nft.save();

    // Update collection
    if (!collection.isOnSale) {
      collection.isOnSale = true;
      await collection.save();
    }

    return savedSale;
  }

  async findAll(query: any = {}) {
    return this.saleModel.find(query);
  }

  async findOne(id: string) {
    const sale = await this.saleModel.findById(id);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    return sale;
  }

  async update(id: string, userId: string, updateSaleDto: UpdateSaleDto) {
    const sale = await this.saleModel.findById(id);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    if (sale.sellerId !== userId) {
      throw new BadRequestException('You are not the seller of this item');
    }

    if (sale.status !== SaleStatus.ACTIVE) {
      throw new BadRequestException('This sale is no longer active');
    }

    const updatedSale = await this.saleModel.findByIdAndUpdate(
      id,
      updateSaleDto,
      { new: true },
    );

    // If price updated, update NFT price
    if (updateSaleDto.price) {
      await this.nftModel.findByIdAndUpdate(sale.nftId, {
        price: updateSaleDto.price,
      });
    }

    return updatedSale;
  }

  async cancelSale(id: string, userId: string) {
    const sale = await this.saleModel.findById(id);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    if (sale.sellerId !== userId) {
      throw new BadRequestException('You are not the seller of this item');
    }

    if (sale.status !== SaleStatus.ACTIVE) {
      throw new BadRequestException('This sale is no longer active');
    }

    // Update sale status
    sale.status = SaleStatus.CANCELLED;
    await sale.save();

    // Update NFT
    const nft = await this.nftModel.findById(sale.nftId);
    if (nft) {
      nft.isForSale = false;
      nft.currentSaleId = null;
      await nft.save();
    }

    return { message: 'Sale cancelled successfully' };
  }

  async buySale(id: string, buyerId: string, buySaleDto: BuySaleDto) {
    const { transactionHash } = buySaleDto;
    const sale = await this.saleModel.findById(id);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    if (sale.status !== SaleStatus.ACTIVE) {
      throw new BadRequestException('This sale is no longer active');
    }

    if (sale.sellerId === buyerId) {
      throw new BadRequestException('You cannot buy your own NFT');
    }

    if (sale.type === SaleType.AUCTION) {
      throw new BadRequestException(
        'This is an auction. Please place a bid instead',
      );
    }

    // Update sale
    sale.status = SaleStatus.SOLD;
    sale.buyerId = buyerId;
    sale.transactionHash = transactionHash;
    sale.soldAt = new Date();
    await sale.save();

    // Update NFT ownership
    const nft = await this.nftModel.findById(sale.nftId);
    if (nft) {
      nft.userId = buyerId;
      nft.isForSale = false;
      nft.currentSaleId = null;
      await nft.save();
    }

    // Update collection stats
    await this.updateCollectionStats(sale.collectionId);

    return { message: 'NFT purchased successfully', sale };
  }

  async placeBid(buyerId: string, placeBidDto: PlaceBidDto) {
    const { saleId, amount } = placeBidDto;
    const sale = await this.saleModel.findById(saleId);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${saleId} not found`);
    }

    if (sale.status !== SaleStatus.ACTIVE) {
      throw new BadRequestException('This sale is no longer active');
    }

    if (sale.sellerId === buyerId) {
      throw new BadRequestException('You cannot bid on your own NFT');
    }

    if (sale.type !== SaleType.AUCTION) {
      throw new BadRequestException(
        'This is a fixed price sale. Please use buy instead',
      );
    }

    // Check if auction has ended
    if (sale.endTime && new Date(sale.endTime) < new Date()) {
      throw new BadRequestException('This auction has already ended');
    }

    // Get highest bid
    const highestBid = sale.bids.length
      ? Math.max(...sale.bids.map(bid => bid.amount))
      : 0;

    // Check if bid is higher than current highest bid or starting price
    if (amount <= highestBid || amount < sale.price) {
      throw new BadRequestException(
        `Bid must be higher than current highest bid (${
          highestBid > 0 ? highestBid : sale.price
        })`,
      );
    }

    // Add bid
    sale.bids.push({
      bidderId: buyerId,
      amount,
      timestamp: new Date(),
    });

    await sale.save();

    return { message: 'Bid placed successfully', sale };
  }

  async endAuction(id: string, userId: string, transactionHash?: string) {
    const sale = await this.saleModel.findById(id);

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    if (sale.sellerId !== userId) {
      throw new BadRequestException('You are not the seller of this item');
    }

    if (sale.status !== SaleStatus.ACTIVE) {
      throw new BadRequestException('This sale is no longer active');
    }

    if (sale.type !== SaleType.AUCTION) {
      throw new BadRequestException('This is not an auction');
    }

    // Check if auction has bids
    if (!sale.bids.length) {
      // No bids, cancel auction
      sale.status = SaleStatus.CANCELLED;
      await sale.save();

      // Update NFT
      const nft = await this.nftModel.findById(sale.nftId);
      if (nft) {
        nft.isForSale = false;
        nft.currentSaleId = null;
        await nft.save();
      }

      return { message: 'Auction cancelled - no bids received' };
    }

    // Get highest bid
    const highestBid = sale.bids.reduce(
      (max, bid) => (bid.amount > max.amount ? bid : max),
      sale.bids[0],
    );

    // Update sale
    sale.status = SaleStatus.SOLD;
    sale.buyerId = highestBid.bidderId;
    sale.soldAt = new Date();
    // Save the final price in the update
    const finalPrice = highestBid.amount;
    sale.transactionHash = transactionHash;
    await sale.save();

    // Update NFT ownership
    const nft = await this.nftModel.findById(sale.nftId);
    if (nft) {
      nft.userId = highestBid.bidderId;
      nft.isForSale = false;
      nft.currentSaleId = null;
      await nft.save();
    }

    // Update collection stats
    await this.updateCollectionStats(sale.collectionId);

    return { message: 'Auction ended successfully', sale, finalPrice };
  }

  async getSalesByCollection(collectionId: string) {
    return this.saleModel.find({ collectionId });
  }

  async getSalesBySeller(sellerId: string) {
    return this.saleModel.find({ sellerId });
  }

  async getSalesByBuyer(buyerId: string) {
    return this.saleModel.find({ buyerId });
  }

  private async updateCollectionStats(collectionId: string) {
    const collection = await this.collectionModel.findById(collectionId);
    if (!collection) return;

    // Count active sales
    const activeSalesCount = await this.saleModel.countDocuments({
      collectionId,
      status: SaleStatus.ACTIVE,
    });

    // Get total volume
    const sales = await this.saleModel.find({
      collectionId,
      status: SaleStatus.SOLD,
    });

    const totalVolume = sales.reduce((sum, sale) => {
      // Get price from either finalPrice (auction) or regular price
      const salePrice = (sale as any).finalPrice || sale.price;
      return sum + salePrice;
    }, 0);

    // Find floor price (lowest active sale)
    const lowestActiveSale = await this.saleModel
      .findOne({
        collectionId,
        status: SaleStatus.ACTIVE,
      })
      .sort({ price: 1 });

    const floorPrice = lowestActiveSale ? lowestActiveSale.price : 0;

    // Update collection
    collection.isOnSale = activeSalesCount > 0;
    collection.floorPrice = floorPrice;
    collection.totalVolume = totalVolume;
    await collection.save();
  }
}
