import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// ABI imports
const NFT_MARKETPLACE_ABI = [
  // Events
  'event ItemListed(address indexed seller, address indexed nftAddress, uint256 indexed tokenId, uint256 price)',
  'event ItemSold(address seller, address indexed buyer, address indexed nftAddress, uint256 indexed tokenId, uint256 price)',
  'event ItemCancelled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId)',

  // Functions
  'function listItem(address nftAddress, uint256 tokenId, uint256 price) external',
  'function buyItem(address nftAddress, uint256 tokenId) external payable',
  'function cancelListing(address nftAddress, uint256 tokenId) external',
  'function listings(address nftAddress, uint256 tokenId) external view returns (address seller, uint256 price)',
];

const UMINT_NFT_ABI = [
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event BaseURIUpdated(string newBaseURI)',

  // Functions
  'function safeMint(address to) public',
  'function setBaseURI(string calldata newBaseURI) public',
  'function tokenURI(uint256 tokenId) external view returns (string memory)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private marketplaceContract: ethers.Contract | null = null;
  private nftContract: ethers.Contract | null = null;
  private signer: ethers.Wallet | null = null;

  constructor(private configService: ConfigService) {
    this.initializeBlockchain();
  }

  private async initializeBlockchain() {
    try {
      // Initialize provider (for testnet)
      const rpcUrl = this.configService.get<string>('ETHEREUM_RPC_URL');
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Initialize contracts
      const marketplaceAddress = this.configService.get<string>(
        'MARKETPLACE_CONTRACT_ADDRESS',
      );
      const nftAddress = this.configService.get<string>('NFT_CONTRACT_ADDRESS');

      if (marketplaceAddress) {
        this.marketplaceContract = new ethers.Contract(
          marketplaceAddress,
          NFT_MARKETPLACE_ABI,
          this.provider,
        );
      }

      if (nftAddress) {
        this.nftContract = new ethers.Contract(
          nftAddress,
          UMINT_NFT_ABI,
          this.provider,
        );
      }

      // Initialize signer if private key is provided
      const privateKey = this.configService.get<string>('ETHEREUM_PRIVATE_KEY');
      if (privateKey) {
        this.signer = new ethers.Wallet(privateKey, this.provider);

        // Connect contracts to signer
        if (this.marketplaceContract) {
          this.marketplaceContract = new ethers.Contract(
            marketplaceAddress!,
            NFT_MARKETPLACE_ABI,
            this.signer,
          );
        }

        if (this.nftContract) {
          this.nftContract = new ethers.Contract(
            nftAddress!,
            UMINT_NFT_ABI,
            this.signer,
          );
        }
      }

      this.logger.log('Blockchain service initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize blockchain service: ${error.message}`,
      );
    }
  }

  // NFT Contract Methods
  async mintNFT(
    toAddress: string,
  ): Promise<{ tokenId: string; txHash: string }> {
    try {
      if (!this.signer || !this.nftContract) {
        throw new Error('Signer or NFT contract not initialized');
      }

      const tx = await this.nftContract.safeMint(toAddress);
      const receipt = await tx.wait();

      // Find the Transfer event to get the tokenId
      const transferEvent = receipt.logs
        .map(log => {
          try {
            return this.nftContract!.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === 'Transfer');

      const tokenId = transferEvent
        ? transferEvent.args.tokenId.toString()
        : null;

      return {
        tokenId,
        txHash: receipt.hash,
      };
    } catch (error) {
      this.logger.error(`Error minting NFT: ${error.message}`);
      throw error;
    }
  }

  async setBaseURI(newBaseURI: string): Promise<string> {
    try {
      if (!this.signer || !this.nftContract) {
        throw new Error('Signer or NFT contract not initialized');
      }

      const tx = await this.nftContract.setBaseURI(newBaseURI);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error setting base URI: ${error.message}`);
      throw error;
    }
  }

  async getTokenURI(tokenId: string): Promise<string> {
    try {
      if (!this.nftContract) {
        throw new Error('NFT contract not initialized');
      }
      return await this.nftContract.tokenURI(tokenId);
    } catch (error) {
      this.logger.error(`Error getting token URI: ${error.message}`);
      throw error;
    }
  }

  async getOwnerOf(tokenId: string): Promise<string> {
    try {
      if (!this.nftContract) {
        throw new Error('NFT contract not initialized');
      }
      return await this.nftContract.ownerOf(tokenId);
    } catch (error) {
      this.logger.error(`Error getting owner: ${error.message}`);
      throw error;
    }
  }

  // Marketplace Contract Methods
  async listItem(
    nftAddress: string,
    tokenId: string,
    price: string,
  ): Promise<string> {
    try {
      if (!this.signer || !this.marketplaceContract) {
        throw new Error('Signer or marketplace contract not initialized');
      }

      const priceInWei = ethers.parseEther(price);
      const tx = await this.marketplaceContract.listItem(
        nftAddress,
        tokenId,
        priceInWei,
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error listing item: ${error.message}`);
      throw error;
    }
  }

  async buyItem(
    nftAddress: string,
    tokenId: string,
    price: string,
  ): Promise<string> {
    try {
      if (!this.signer || !this.marketplaceContract) {
        throw new Error('Signer or marketplace contract not initialized');
      }

      const priceInWei = ethers.parseEther(price);
      const tx = await this.marketplaceContract.buyItem(nftAddress, tokenId, {
        value: priceInWei,
      });
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error buying item: ${error.message}`);
      throw error;
    }
  }

  async cancelListing(nftAddress: string, tokenId: string): Promise<string> {
    try {
      if (!this.signer || !this.marketplaceContract) {
        throw new Error('Signer or marketplace contract not initialized');
      }

      const tx = await this.marketplaceContract.cancelListing(
        nftAddress,
        tokenId,
      );
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      this.logger.error(`Error cancelling listing: ${error.message}`);
      throw error;
    }
  }

  async getListing(
    nftAddress: string,
    tokenId: string,
  ): Promise<{ seller: string; price: string }> {
    try {
      if (!this.marketplaceContract) {
        throw new Error('Marketplace contract not initialized');
      }

      const listing = await this.marketplaceContract.listings(
        nftAddress,
        tokenId,
      );
      return {
        seller: listing.seller,
        price: ethers.formatEther(listing.price),
      };
    } catch (error) {
      this.logger.error(`Error getting listing: ${error.message}`);
      throw error;
    }
  }

  // Helper methods
  getMarketplaceAddress(): string {
    if (!this.marketplaceContract) {
      return '';
    }
    return this.marketplaceContract.target.toString();
  }

  getNFTAddress(): string {
    if (!this.nftContract) {
      return '';
    }
    return this.nftContract.target.toString();
  }
}
