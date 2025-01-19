import { Controller, Get, Ip, Req } from '@nestjs/common';
import { User } from 'schemas/user.schema';
import { AppService } from './app.service';
@Controller('app')
export class AppController {
  constructor(private appService: AppService) {}
  @Get()
  async findAll(): Promise<User[]> {
    return this.appService.findAll();
  }
}
