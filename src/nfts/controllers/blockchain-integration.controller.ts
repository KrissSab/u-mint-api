import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { BlockchainIntegrationService } from '../services/blockchain-integration.service';

@Controller()
export class BlockchainIntegrationController {
  constructor(
    private readonly blockchainIntegrationService: BlockchainIntegrationService,
  ) {}

  @Post('nfts/blockchain/mint/:nftId/:userId')
  @HttpCode(HttpStatus.OK)
  async mintNFTOnBlockchain(
    @Param('nftId') nftId: string,
    @Param('userId') userId: string,
  ) {
    return this.blockchainIntegrationService.mintNFTOnBlockchain(userId, nftId);
  }

  @Post('sales/blockchain/list/:saleId/:userId')
  @HttpCode(HttpStatus.OK)
  async listNFTForSale(
    @Param('saleId') saleId: string,
    @Param('userId') userId: string,
  ) {
    return this.blockchainIntegrationService.listNFTForSale(saleId, userId);
  }

  @Post('sales/blockchain/buy/:saleId/:buyerId')
  @HttpCode(HttpStatus.OK)
  async buyNFT(
    @Param('saleId') saleId: string,
    @Param('buyerId') buyerId: string,
  ) {
    return this.blockchainIntegrationService.buyNFT(saleId, buyerId);
  }

  @Post('sales/blockchain/cancel/:saleId/:userId')
  @HttpCode(HttpStatus.OK)
  async cancelSale(
    @Param('saleId') saleId: string,
    @Param('userId') userId: string,
  ) {
    return this.blockchainIntegrationService.cancelSale(saleId, userId);
  }

  @Post('nfts/blockchain/sync/:nftId')
  @HttpCode(HttpStatus.OK)
  async syncNFTWithBlockchain(@Param('nftId') nftId: string) {
    await this.blockchainIntegrationService.syncNFTWithBlockchain(nftId);
    return { success: true };
  }
}
