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

@Injectable()
export class NftsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(NFT.name) private nftModel: Model<NFTDocument>,
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
}
