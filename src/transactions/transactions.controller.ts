import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll() {
    return this.transactionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  record(@Body() payload: Record<string, any>) {
    return this.transactionsService.recordTransaction(payload);
  }

  @Get('logs/reencryption')
  getReencryptionLogs() {
    return this.transactionsService.getReencryptionLogs();
  }

  @Post('reencrypt')
  @HttpCode(HttpStatus.OK)
  reencrypt(
    @Body() body: { newKeyVersion: string; reason: string },
  ) {
    return this.transactionsService.reencryptAll(body.newKeyVersion, body.reason);
  }
}
