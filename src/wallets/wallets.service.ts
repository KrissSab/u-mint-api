import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { AddWalletDto, RemoveWalletDto } from './dto/wallet.dto';
import { WalletAddedEvent } from '../mail/mail.events';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async addWallet(addWalletDto: AddWalletDto) {
    const { userId, type, address } = addWalletDto;

    try {
      // Check if user exists
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Check if wallet already exists
      const walletExists = await this.walletModel.findOne({ address });
      if (walletExists) {
        // If the wallet exists but belongs to the same user, it's not an error
        if (walletExists.userId === userId) {
          return walletExists; // Return the existing wallet
        }
        throw new BadRequestException(
          'This wallet is already linked to another user',
        );
      }

      // Create new wallet
      const newWallet = new this.walletModel({
        userId,
        type,
        address,
      });

      const savedWallet = await newWallet.save();

      // Emit event for wallet added email (non-blocking) - only if user has email
      if (user.email) {
        this.eventEmitter.emit(
          'wallet.added',
          new WalletAddedEvent(user.email, type, address),
        );
      }

      return savedWallet;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        throw new BadRequestException(
          'This wallet address is already registered',
        );
      }

      throw new BadRequestException(`Failed to add wallet: ${error.message}`);
    }
  }

  async removeWallet(removeWalletDto: RemoveWalletDto) {
    const { userId, address } = removeWalletDto;

    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Find and delete the wallet
    const deletedWallet = await this.walletModel.findOneAndDelete({
      userId,
      address,
    });

    if (!deletedWallet) {
      throw new NotFoundException(
        `Wallet with address ${address} not found for this user`,
      );
    }

    return { message: 'Wallet deleted successfully' };
  }

  async getWallets(userId: string) {
    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.walletModel.find({ userId });
  }

  async findWalletByAddress(address: string) {
    const wallet = await this.walletModel.findOne({ address });

    if (!wallet) {
      throw new NotFoundException(`Wallet with address ${address} not found`);
    }

    return wallet;
  }
}
