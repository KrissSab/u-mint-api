import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

class MintNftDto {
  address: string;
}

class SetBaseUriDto {
  baseUri: string;
}

class ListItemDto {
  nftAddress: string;
  tokenId: string;
  price: string;
}

class BuyItemDto {
  nftAddress: string;
  tokenId: string;
  price: string;
}

class CancelListingDto {
  nftAddress: string;
  tokenId: string;
}

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Get('addresses')
  getContractAddresses() {
    return {
      nftContract: this.blockchainService.getNFTAddress(),
      marketplaceContract: this.blockchainService.getMarketplaceAddress(),
    };
  }

  @Post('mint')
  async mintNFT(@Body() mintNftDto: MintNftDto) {
    return this.blockchainService.mintNFT(mintNftDto.address);
  }

  @Post('set-base-uri')
  async setBaseURI(@Body() setBaseUriDto: SetBaseUriDto) {
    return {
      txHash: await this.blockchainService.setBaseURI(setBaseUriDto.baseUri),
    };
  }

  @Get('token/:tokenId')
  async getTokenInfo(@Param('tokenId') tokenId: string) {
    const [uri, owner] = await Promise.all([
      this.blockchainService.getTokenURI(tokenId),
      this.blockchainService.getOwnerOf(tokenId),
    ]);

    return {
      tokenId,
      uri,
      owner,
    };
  }

  @Post('list')
  async listItem(@Body() listItemDto: ListItemDto) {
    const txHash = await this.blockchainService.listItem(
      listItemDto.nftAddress,
      listItemDto.tokenId,
      listItemDto.price,
    );
    return { txHash };
  }

  @Post('buy')
  async buyItem(@Body() buyItemDto: BuyItemDto) {
    const txHash = await this.blockchainService.buyItem(
      buyItemDto.nftAddress,
      buyItemDto.tokenId,
      buyItemDto.price,
    );
    return { txHash };
  }

  @Post('cancel')
  async cancelListing(@Body() cancelListingDto: CancelListingDto) {
    const txHash = await this.blockchainService.cancelListing(
      cancelListingDto.nftAddress,
      cancelListingDto.tokenId,
    );
    return { txHash };
  }

  @Get('listing')
  async getListing(
    @Query('nftAddress') nftAddress: string,
    @Query('tokenId') tokenId: string,
  ) {
    return this.blockchainService.getListing(nftAddress, tokenId);
  }
}
