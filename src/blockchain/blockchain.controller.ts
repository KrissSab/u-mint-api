import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

class MintNftDto {
  address: string;
}

class ListItemDto {
  tokenId: string;
  price: string;
}

class BuyItemDto {
  tokenId: string;
  price: string;
}

class CancelListingDto {
  tokenId: string;
}

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('addresses')
  getContractAddresses() {
    return {
      platformContract: this.blockchainService.getPlatformAddress(),
    };
  }

  @Post('mint')
  async mintNFT(@Body() mintNftDto: MintNftDto) {
    return this.blockchainService.mintNFT(mintNftDto.address);
  }

  @Get('token/:tokenId')
  async getTokenInfo(@Param('tokenId') tokenId: string) {
    const [owner, listing] = await Promise.all([
      this.blockchainService.getOwnerOf(tokenId),
      this.blockchainService.getListing(tokenId),
    ]);
    return { tokenId, owner, listing };
  }

  @Get('nonce/:address')
  async getNonce(@Param('address') address: string) {
    return { nonce: await this.blockchainService.getNonce(address) };
  }

  @Post('list')
  async listItem(@Body() dto: ListItemDto) {
    return { txHash: await this.blockchainService.listItem(dto.tokenId, dto.price) };
  }

  @Post('buy')
  async buyItem(@Body() dto: BuyItemDto) {
    return { txHash: await this.blockchainService.buyItem(dto.tokenId, dto.price) };
  }

  @Post('cancel')
  async cancelListing(@Body() dto: CancelListingDto) {
    return { txHash: await this.blockchainService.cancelListing(dto.tokenId) };
  }

  @Get('listing')
  async getListing(@Query('tokenId') tokenId: string) {
    return this.blockchainService.getListing(tokenId);
  }
}
