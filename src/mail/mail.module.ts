import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailListener } from './mail.listener';

@Global()
@Module({
  providers: [MailService, MailListener],
  exports: [MailService],
})
export class MailModule {}
