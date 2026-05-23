import { Body, Controller, Get, Post } from '@nestjs/common';
import { ConsensusService } from './consensus.service';
import { ValidateOperationDto } from './dto/validate.dto';

@Controller('consensus')
export class ConsensusController {
  constructor(private readonly consensusService: ConsensusService) {}

  // Peer-to-peer endpoint: another node asks this node to validate an operation
  @Post('validate')
  validate(@Body() dto: ValidateOperationDto) {
    return this.consensusService.validate(dto);
  }

  // Status endpoint — useful during demo to show which node is responding
  @Get('status')
  status() {
    return {
      nodeId: this.consensusService.getNodeId(),
      timestamp: new Date().toISOString(),
    };
  }
}
