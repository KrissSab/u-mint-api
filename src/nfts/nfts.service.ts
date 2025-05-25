import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NFT, NFTDocument } from './schemas/nft.schema';
import { NFTDto } from './dto/nft.dto';
import { NFTAddedEvent } from '../mail/mail.events';
import { CreateNftDto } from './dto/create-nft.dto';
import { Collection, CollectionDocument } from './schemas/collection.schema';

@Injectable()
export class NftsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(NFT.name) private nftModel: Model<NFTDocument>,
    @InjectModel(Collection.name)
    private collectionModel: Model<CollectionDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async addNFT(userId: string, nftDto: NFTDto) {
    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if NFT already exists
    const nftExists = await this.nftModel.findOne({
      tokenId: nftDto.tokenId,
      contractAddress: nftDto.contractAddress,
    });

    if (nftExists) {
      throw new BadRequestException('This NFT is already linked to a user');
    }

    // Create new NFT
    const newNFT = new this.nftModel({
      userId,
      tokenId: nftDto.tokenId,
      contractAddress: nftDto.contractAddress,
      name: nftDto.name,
      description: nftDto.description || '',
      imageUrl: nftDto.imageUrl || '',
      metadata: nftDto.metadata || {},
      blockchain: nftDto.blockchain,
    });

    const savedNFT = await newNFT.save();

    this.eventEmitter.emit(
      'nft.added',
      new NFTAddedEvent(
        user.email,
        nftDto.name,
        nftDto.contractAddress,
        nftDto.tokenId,
        nftDto.imageUrl,
      ),
    );

    return savedNFT;
  }

  async removeNFT(userId: string, tokenId: string, contractAddress: string) {
    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find and delete the NFT
    const deletedNFT = await this.nftModel.findOneAndDelete({
      userId,
      tokenId,
      contractAddress,
    });

    if (!deletedNFT) {
      throw new NotFoundException(
        `NFT with tokenId ${tokenId} and contract ${contractAddress} not found for this user`,
      );
    }

    return { message: 'NFT deleted successfully' };
  }

  async getNFTs(userId: string) {
    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.nftModel.find({ userId });
  }

  async addNftToUser(userId: string, createNftDto: CreateNftDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // If collection ID is provided, verify it exists
    if (createNftDto.collectionId) {
      const collection = await this.collectionModel.findById(
        createNftDto.collectionId,
      );
      if (!collection) {
        throw new NotFoundException(
          `Collection with ID ${createNftDto.collectionId} not found`,
        );
      }
    }

    const newNft = new this.nftModel({
      ...createNftDto,
      userId,
    });

    const savedNft = await newNft.save();

    // If NFT is part of a collection, update collection stats
    if (createNftDto.collectionId) {
      await this.updateCollectionStats(createNftDto.collectionId);
    }

    return savedNft;
  }

  async getUserNfts(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.nftModel.find({ userId });
  }

  async getNftById(id: string) {
    const nft = await this.nftModel.findById(id);
    if (!nft) {
      throw new NotFoundException(`NFT with ID ${id} not found`);
    }
    return nft;
  }

  async getAllNfts() {
    return this.nftModel.find();
  }

  async removeNftFromUser(
    userId: string,
    tokenId: string,
    contractAddress: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const nft = await this.nftModel.findOne({
      userId,
      tokenId,
      contractAddress,
    });

    if (!nft) {
      throw new NotFoundException(
        `NFT with tokenId ${tokenId} and contract ${contractAddress} not found for this user`,
      );
    }

    // If NFT is part of a collection, update collection stats
    const collectionId = nft.collectionId;

    await this.nftModel.deleteOne({
      userId,
      tokenId,
      contractAddress,
    });

    if (collectionId) {
      await this.updateCollectionStats(collectionId);
    }

    return { message: 'NFT removed successfully' };
  }

  async createNftInCollection(
    userId: string,
    collectionId: string,
    createNftDto: CreateNftDto,
  ) {
    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if collection exists and belongs to user
    const collection = await this.collectionModel.findById(collectionId);
    if (!collection) {
      throw new NotFoundException(
        `Collection with ID ${collectionId} not found`,
      );
    }

    if (collection.creatorId !== userId) {
      throw new NotFoundException(
        'You do not have permission to add NFTs to this collection',
      );
    }

    // Create NFT
    const newNft = new this.nftModel({
      ...createNftDto,
      userId,
      collectionId,
    });

    const savedNft = await newNft.save();

    // Update collection stats
    await this.updateCollectionStats(collectionId);

    return savedNft;
  }

  private async updateCollectionStats(collectionId: string) {
    const collection = await this.collectionModel.findById(collectionId);
    if (!collection) return;

    // Count total items
    const totalItems = await this.nftModel.countDocuments({ collectionId });

    // Update collection
    collection.totalItems = totalItems;
    await collection.save();
  }
}
