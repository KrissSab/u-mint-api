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
import { SalesService } from './sales.service';
import {
  CreateSaleDto,
  UpdateSaleDto,
  PlaceBidDto,
  BuySaleDto,
} from './dto/sale.dto';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post(':userId')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('userId') userId: string,
    @Body() createSaleDto: CreateSaleDto,
  ) {
    return this.salesService.createSale(userId, createSaleDto);
  }

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Get('collection/:collectionId')
  getSalesByCollection(@Param('collectionId') collectionId: string) {
    return this.salesService.getSalesByCollection(collectionId);
  }

  @Get('seller/:sellerId')
  getSalesBySeller(@Param('sellerId') sellerId: string) {
    return this.salesService.getSalesBySeller(sellerId);
  }

  @Get('buyer/:buyerId')
  getSalesByBuyer(@Param('buyerId') buyerId: string) {
    return this.salesService.getSalesByBuyer(buyerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id/:userId')
  update(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() updateSaleDto: UpdateSaleDto,
  ) {
    return this.salesService.update(id, userId, updateSaleDto);
  }

  @Delete(':id/:userId')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @Param('userId') userId: string) {
    return this.salesService.cancelSale(id, userId);
  }

  @Post(':id/buy/:buyerId')
  @HttpCode(HttpStatus.OK)
  buy(
    @Param('id') id: string,
    @Param('buyerId') buyerId: string,
    @Body() buySaleDto: BuySaleDto,
  ) {
    return this.salesService.buySale(id, buyerId, buySaleDto);
  }

  @Post('bid/:buyerId')
  @HttpCode(HttpStatus.OK)
  placeBid(
    @Param('buyerId') buyerId: string,
    @Body() placeBidDto: PlaceBidDto,
  ) {
    return this.salesService.placeBid(buyerId, placeBidDto);
  }

  @Post(':id/end-auction/:userId')
  @HttpCode(HttpStatus.OK)
  endAuction(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { transactionHash?: string },
  ) {
    return this.salesService.endAuction(id, userId, body.transactionHash);
  }
}
