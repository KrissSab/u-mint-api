import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { BlockchainIntegrationService } from '../services/blockchain-integration.service';

@Controller()
export class BlockchainIntegrationController {
  constructor(
    private readonly blockchainIntegrationService: BlockchainIntegrationService,
  ) {}

  @Post('nfts/blockchain/mint/:nftId')
  @HttpCode(HttpStatus.OK)
  async mintNFTOnBlockchain(@Param('nftId') nftId: string) {
    return this.blockchainIntegrationService.mintNFTOnBlockchain('', nftId);
  }

  @Post('collections/blockchain/create/:collectionId')
  @HttpCode(HttpStatus.OK)
  async createCollectionOnBlockchain(
    @Param('collectionId') collectionId: string,
  ) {
    return {
      txHash:
        await this.blockchainIntegrationService.createCollectionOnBlockchain(
          collectionId,
        ),
    };
  }

  @Post('sales/blockchain/list/:saleId')
  @HttpCode(HttpStatus.OK)
  async listNFTForSale(@Param('saleId') saleId: string) {
    return {
      txHash: await this.blockchainIntegrationService.listNFTForSale(saleId),
    };
  }

  @Post('sales/blockchain/buy/:saleId/:buyerId')
  @HttpCode(HttpStatus.OK)
  async buyNFT(
    @Param('saleId') saleId: string,
    @Param('buyerId') buyerId: string,
  ) {
    return {
      txHash: await this.blockchainIntegrationService.buyNFT(saleId, buyerId),
    };
  }

  @Post('sales/blockchain/cancel/:saleId')
  @HttpCode(HttpStatus.OK)
  async cancelSale(@Param('saleId') saleId: string) {
    return {
      txHash: await this.blockchainIntegrationService.cancelSale(saleId),
    };
  }

  @Post('nfts/blockchain/sync/:nftId')
  @HttpCode(HttpStatus.OK)
  async syncNFTWithBlockchain(@Param('nftId') nftId: string) {
    await this.blockchainIntegrationService.syncNFTWithBlockchain(nftId);
    return { success: true };
  }
}
