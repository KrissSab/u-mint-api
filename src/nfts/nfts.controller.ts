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
import { CreateNftDto } from './dto/create-nft.dto';

@Controller('nfts')
export class NftsController {
  constructor(private readonly nftsService: NftsService) {}

  @Get()
  getAllNfts() {
    return this.nftsService.getAllNfts();
  }

  @Post('user/:userId')
  @HttpCode(HttpStatus.CREATED)
  addNftToUser(@Param('userId') userId: string, @Body() nftDto: NFTDto) {
    return this.nftsService.addNftToUser(userId, nftDto);
  }

  @Get('user/:userId')
  getUserNfts(@Param('userId') userId: string) {
    return this.nftsService.getUserNfts(userId);
  }

  @Get(':id')
  getNftById(@Param('id') id: string) {
    return this.nftsService.getNftById(id);
  }

  @Delete('user/:userId/:tokenId/:contractAddress')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeNftFromUser(
    @Param('userId') userId: string,
    @Param('tokenId') tokenId: string,
    @Param('contractAddress') contractAddress: string,
  ) {
    return this.nftsService.removeNftFromUser(userId, tokenId, contractAddress);
  }

  @Post('collection/:collectionId/user/:userId')
  @HttpCode(HttpStatus.CREATED)
  createNftInCollection(
    @Param('userId') userId: string,
    @Param('collectionId') collectionId: string,
    @Body() createNftDto: CreateNftDto,
  ) {
    return this.nftsService.createNftInCollection(
      userId,
      collectionId,
      createNftDto,
    );
  }
}
