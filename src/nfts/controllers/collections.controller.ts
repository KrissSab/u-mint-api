import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { CollectionsService } from '../services/collections.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
} from '../dto/collection.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post(':userId')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('userId') userId: string,
    @Body() createCollectionDto: CreateCollectionDto,
  ) {
    return this.collectionsService.createCollection(
      userId,
      createCollectionDto,
    );
  }

  @Get()
  findAll() {
    return this.collectionsService.findAll();
  }

  @Get('creator/:creatorId')
  findByCreator(@Param('creatorId') creatorId: string) {
    return this.collectionsService.findByCreator(creatorId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collectionsService.findOne(id);
  }

  @Get(':id/nfts')
  getCollectionNFTs(@Param('id') id: string) {
    return this.collectionsService.getCollectionNFTs(id);
  }

  @Patch(':id/:userId')
  update(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(id, userId, updateCollectionDto);
  }

  @Delete(':id/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Param('userId') userId: string) {
    return this.collectionsService.remove(id, userId);
  }

  @Post(':collectionId/nft/:nftId')
  @HttpCode(HttpStatus.OK)
  addNFTToCollection(
    @Param('collectionId') collectionId: string,
    @Param('nftId') nftId: string,
  ) {
    return this.collectionsService.addNFTToCollection(collectionId, nftId);
  }

  @Delete(':collectionId/nft/:nftId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeNFTFromCollection(
    @Param('collectionId') collectionId: string,
    @Param('nftId') nftId: string,
  ) {
    return this.collectionsService.removeNFTFromCollection(collectionId, nftId);
  }

  @Post(':id/update-stats')
  @HttpCode(HttpStatus.OK)
  updateStats(@Param('id') id: string) {
    return this.collectionsService.updateCollectionStats(id);
  }
}
