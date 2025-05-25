import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Collection, CollectionDocument } from './schemas/collection.schema';
import { NFT, NFTDocument } from './schemas/nft.schema';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
    @InjectModel(NFT.name) private nftModel: Model<NFTDocument>,
  ) {}

  async createCollection(
    userId: string,
    createCollectionDto: CreateCollectionDto,
  ) {
    // Create new collection
    const newCollection = new this.collectionModel({
      ...createCollectionDto,
      creatorId: userId,
    });

    return newCollection.save();
  }

  async findAll(query: any = {}) {
    return this.collectionModel.find(query);
  }

  async findOne(id: string) {
    const collection = await this.collectionModel.findById(id);

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    return collection;
  }

  async findByCreator(creatorId: string) {
    return this.collectionModel.find({ creatorId });
  }

  async update(
    id: string,
    userId: string,
    updateCollectionDto: UpdateCollectionDto,
  ) {
    // Check if collection exists and belongs to user
    const collection = await this.collectionModel.findById(id);

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    if (collection.creatorId !== userId) {
      throw new BadRequestException(
        'You do not have permission to update this collection',
      );
    }

    return this.collectionModel.findByIdAndUpdate(id, updateCollectionDto, {
      new: true,
    });
  }

  async remove(id: string, userId: string) {
    // Check if collection exists and belongs to user
    const collection = await this.collectionModel.findById(id);

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    if (collection.creatorId !== userId) {
      throw new BadRequestException(
        'You do not have permission to delete this collection',
      );
    }

    // Check if collection has NFTs
    const nftsCount = await this.nftModel.countDocuments({ collectionId: id });

    if (nftsCount > 0) {
      throw new BadRequestException('Cannot delete collection with NFTs');
    }

    return this.collectionModel.findByIdAndDelete(id);
  }

  async addNFTToCollection(collectionId: string, nftId: string) {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException(
        `Collection with ID ${collectionId} not found`,
      );
    }

    // Update NFT with collection ID
    await this.nftModel.findByIdAndUpdate(nftId, { collectionId });

    // Update collection stats
    collection.totalItems += 1;
    return collection.save();
  }

  async removeNFTFromCollection(collectionId: string, nftId: string) {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException(
        `Collection with ID ${collectionId} not found`,
      );
    }

    // Update NFT to remove collection ID
    await this.nftModel.findByIdAndUpdate(nftId, {
      $unset: { collectionId: 1 },
    });

    // Update collection stats
    if (collection.totalItems > 0) {
      collection.totalItems -= 1;
    }

    return collection.save();
  }

  async getCollectionNFTs(collectionId: string) {
    return this.nftModel.find({ collectionId });
  }

  async updateCollectionStats(collectionId: string) {
    const collection = await this.collectionModel.findById(collectionId);

    if (!collection) {
      throw new NotFoundException(
        `Collection with ID ${collectionId} not found`,
      );
    }

    // Count total items
    const totalItems = await this.nftModel.countDocuments({ collectionId });

    // Find floor price (lowest priced NFT for sale)
    const lowestPricedNFT = await this.nftModel
      .findOne({ collectionId, isForSale: true })
      .sort({ price: 1 });

    const floorPrice = lowestPricedNFT ? lowestPricedNFT.price : 0;

    // Update collection
    collection.totalItems = totalItems;
    collection.floorPrice = floorPrice;

    return collection.save();
  }
}
