import { Injectable } from '@nestjs/common';
import { CreateNftDto } from './dto/create-nft.dto';
import { UpdateNftDto } from './dto/update-nft.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NftService {
  constructor(private readonly configService: ConfigService) {}
  create(createNftDto: CreateNftDto) {}

  findAll() {
    return `This action returns all nfts`;
  }

  findOne(id: number) {
    return `This action returns a #${id} nft`;
  }

  update(id: number, updateNftDto: UpdateNftDto) {
    return `This action updates a #${id} nft`;
  }

  remove(id: number) {
    return `This action removes a #${id} nft`;
  }
}
