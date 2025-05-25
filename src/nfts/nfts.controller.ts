import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { NftsService } from './nfts.service';
import { NFTDto } from './dto/nft.dto';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Post('user/:userId')
  @HttpCode(HttpStatus.CREATED)
  addNFT(@Param('userId') userId: string, @Body() nftDto: NFTDto) {
    return this.nftsService.addNFT(userId, nftDto);
  }

  @Delete('user/:userId/:tokenId/:contractAddress')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeNFT(
    @Param('userId') userId: string,
    @Param('tokenId') tokenId: string,
    @Param('contractAddress') contractAddress: string,
  ) {
    return this.nftsService.removeNFT(userId, tokenId, contractAddress);
  }

  @Get('user/:userId')
  getNFTs(@Param('userId') userId: string) {
    return this.nftsService.getNFTs(userId);
  }
}
