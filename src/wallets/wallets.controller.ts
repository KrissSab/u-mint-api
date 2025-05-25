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
import { WalletsService } from './wallets.service';
import { AddWalletDto, RemoveWalletDto } from './dto/wallet.dto';

@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  addWallet(@Body() addWalletDto: AddWalletDto) {
    return this.walletsService.addWallet(addWalletDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  removeWallet(@Body() removeWalletDto: RemoveWalletDto) {
    return this.walletsService.removeWallet(removeWalletDto);
  }

  @Get('user/:userId')
  getWallets(@Param('userId') userId: string) {
    return this.walletsService.getWallets(userId);
  }
}
