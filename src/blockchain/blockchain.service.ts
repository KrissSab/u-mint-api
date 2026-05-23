import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

const UMINT_PLATFORM_ABI = [
  'event TokenMinted(uint256 indexed tokenId, address indexed author)',
  'event TokenListed(uint256 indexed tokenId, address indexed owner, uint256 price)',
  'event TokenSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)',
  'event ListingCancelled(uint256 indexed tokenId, address indexed owner)',

  'function getNonce(address account) external view returns (uint256)',
  'function mintToken(uint256 tokenId, uint256 nonce) external',
  'function listToken(uint256 tokenId, uint256 price, uint256 nonce) external',
  'function buyToken(uint256 tokenId, uint256 nonce) external payable',
  'function cancelListing(uint256 tokenId, uint256 nonce) external',
  'function tokens(uint256 tokenId) external view returns (address author, address owner)',
  'function listings(uint256 tokenId) external view returns (uint256 price, address owner, bool isActive)',
  'function ROYALTY_PERCENT() external view returns (uint256)',
];

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private platformContract: ethers.Contract | null = null;
  private signer: ethers.Wallet | null = null;

  constructor(private configService: ConfigService) {
    this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    try {
      const rpcUrl = this.configService.get<string>('ETHEREUM_RPC_URL');
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      const platformAddress = this.configService.get<string>('PLATFORM_CONTRACT_ADDRESS');

      if (platformAddress) {
        this.platformContract = new ethers.Contract(
          platformAddress,
          UMINT_PLATFORM_ABI,
          this.provider,
        );
      }

      const privateKey = this.configService.get<string>('ETHEREUM_PRIVATE_KEY');
      if (privateKey) {
        this.signer = new ethers.Wallet(privateKey, this.provider);

        if (this.platformContract && platformAddress) {
          this.platformContract = new ethers.Contract(
            platformAddress,
            UMINT_PLATFORM_ABI,
            this.signer,
          );
        }
      }

      this.logger.log('Blockchain service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize blockchain service: ${error.message}`);
    }
  }

  async getNonce(address: string): Promise<number> {
    if (!this.platformContract) throw new Error('Platform contract not initialized');
    const nonce = await this.platformContract.getNonce(address);
    return Number(nonce);
  }

  async mintNFT(_toAddress: string): Promise<{ tokenId: string; txHash: string }> {
    try {
      if (!this.signer || !this.platformContract) {
        throw new Error('Signer or platform contract not initialized');
      }

      const tokenId = Date.now();
      const nonce = await this.getNonce(this.signer.address);

      const tx = await this.platformContract.mintToken(tokenId, nonce);
      const receipt = await tx.wait();

      return {
        tokenId: tokenId.toString(),
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Error minting NFT: ${error.message}`);
      throw error;
    }
  }

  async listItem(tokenId: string, price: string): Promise<string> {
    try {
      if (!this.signer || !this.platformContract) {
        throw new Error('Signer or platform contract not initialized');
      }

      const priceInWei = ethers.parseEther(price);
      const nonce = await this.getNonce(this.signer.address);

      const tx = await this.platformContract.listToken(
        BigInt(tokenId),
        priceInWei,
        nonce,
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error listing item: ${error.message}`);
      throw error;
    }
  }

  async buyItem(tokenId: string, price: string): Promise<string> {
    try {
      if (!this.signer || !this.platformContract) {
        throw new Error('Signer or platform contract not initialized');
      }

      const priceInWei = ethers.parseEther(price);
      const nonce = await this.getNonce(this.signer.address);

      const tx = await this.platformContract.buyToken(
        BigInt(tokenId),
        nonce,
        { value: priceInWei },
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error buying item: ${error.message}`);
      throw error;
    }
  }

  async cancelListing(tokenId: string): Promise<string> {
    try {
      if (!this.signer || !this.platformContract) {
        throw new Error('Signer or platform contract not initialized');
      }

      const nonce = await this.getNonce(this.signer.address);

      const tx = await this.platformContract.cancelListing(
        BigInt(tokenId),
        nonce,
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error cancelling listing: ${error.message}`);
      throw error;
    }
  }

  async getOwnerOf(tokenId: string): Promise<string> {
    try {
      if (!this.platformContract) throw new Error('Platform contract not initialized');
      const token = await this.platformContract.tokens(BigInt(tokenId));
      return token.owner;
    } catch (error) {
      this.logger.error(`Error getting owner: ${error.message}`);
      throw error;
    }
  }

  async getListing(tokenId: string): Promise<{ price: string; owner: string; isActive: boolean }> {
    try {
      if (!this.platformContract) throw new Error('Platform contract not initialized');
      const listing = await this.platformContract.listings(BigInt(tokenId));
      return {
        price: ethers.formatEther(listing.price),
        owner: listing.owner,
        isActive: listing.isActive,
      };
    } catch (error) {
      this.logger.error(`Error getting listing: ${error.message}`);
      throw error;
    }
  }

  getPlatformAddress(): string {
    if (!this.platformContract) return '';
    return this.platformContract.target.toString();
  }

  // Keep backward-compat aliases used by BlockchainIntegrationService
  getNFTAddress(): string {
    return this.getPlatformAddress();
  }

  getMarketplaceAddress(): string {
    return this.getPlatformAddress();
  }
}
