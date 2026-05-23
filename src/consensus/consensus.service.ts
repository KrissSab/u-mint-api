import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NFT, NFTDocument } from '../nfts/schemas/nft.schema';
import { Sale, SaleDocument, SaleStatus } from '../nfts/schemas/sale.schema';
import {
  ValidateOperationDto,
  OperationType,
  NodeVote,
  ConsensusResult,
} from './dto/validate.dto';

@Injectable()
export class ConsensusService {
  private readonly logger = new Logger(ConsensusService.name);
  private readonly nodeId: string;
  private readonly peers: string[];

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(NFT.name) private nftModel: Model<NFTDocument>,
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
  ) {
    this.nodeId = this.configService.get<string>('NODE_ID') || 'node-1';
    const peersEnv = this.configService.get<string>('NODE_PEERS') || '';
    this.peers = peersEnv
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    this.logger.log(
      `Consensus node "${this.nodeId}" started. Peers: [${this.peers.join(', ') || 'none'}]`,
    );
  }

  // Called by the leader to collect votes from all peers and self, then decide
  async requestConsensus(dto: ValidateOperationDto): Promise<ConsensusResult> {
    const totalNodes = this.peers.length + 1;
    // BFT quorum: strictly more than 2/3
    const requiredVotes = Math.ceil((2 / 3) * totalNodes);

    // Self-validate
    const selfVote = await this.validate(dto);
    const votes: NodeVote[] = [selfVote];

    // Ask peers in parallel
    const peerResults = await Promise.allSettled(
      this.peers.map((peer) => this.askPeer(peer, dto)),
    );

    for (const result of peerResults) {
      if (result.status === 'fulfilled') {
        votes.push(result.value);
      } else {
        // A node that doesn't respond counts as a rejection
        votes.push({
          nodeId: 'unknown',
          approved: false,
          reason: `Peer unreachable: ${result.reason}`,
        });
      }
    }

    const approvedVotes = votes.filter((v) => v.approved).length;
    const consensus = approvedVotes >= requiredVotes;

    const result: ConsensusResult = {
      consensus,
      totalNodes,
      approvedVotes,
      requiredVotes,
      votes,
    };

    this.logger.log(
      `Consensus for ${dto.operation}(tokenId=${dto.tokenId}): ` +
        `${approvedVotes}/${totalNodes} votes, required=${requiredVotes}, ` +
        `result=${consensus ? 'APPROVED' : 'REJECTED'}`,
    );

    return result;
  }

  // Application-layer validation — runs on every node (including self)
  async validate(dto: ValidateOperationDto): Promise<NodeVote> {
    try {
      switch (dto.operation) {
        case OperationType.MINT:
          return await this.validateMint(dto);
        case OperationType.LIST:
          return await this.validateList(dto);
        case OperationType.BUY:
          return await this.validateBuy(dto);
        case OperationType.CANCEL:
          return await this.validateCancel(dto);
        default:
          return this.reject(`Unknown operation: ${dto.operation}`);
      }
    } catch (err) {
      return this.reject(`Validation error: ${err.message}`);
    }
  }

  private async validateMint(dto: ValidateOperationDto): Promise<NodeVote> {
    // Check tokenId is not already minted in our DB
    const existing = await this.nftModel.findOne({ tokenId: dto.tokenId });
    if (existing) {
      return this.reject(`TokenId ${dto.tokenId} already exists in DB`);
    }
    return this.approve('Token is new, mint is valid');
  }

  private async validateList(dto: ValidateOperationDto): Promise<NodeVote> {
    const nft = await this.nftModel.findById(dto.nftId);
    if (!nft) return this.reject(`NFT ${dto.nftId} not found`);
    if (nft.userId !== dto.userId) return this.reject('Caller is not the owner');
    if (nft.isForSale) return this.reject('NFT is already listed for sale');
    if (!dto.price || dto.price <= 0) return this.reject('Price must be positive');
    return this.approve('Ownership verified, listing is valid');
  }

  private async validateBuy(dto: ValidateOperationDto): Promise<NodeVote> {
    const sale = await this.saleModel.findById(dto.saleId);
    if (!sale) return this.reject(`Sale ${dto.saleId} not found`);
    if (sale.status !== SaleStatus.ACTIVE) {
      return this.reject(`Sale is not active (status: ${sale.status})`);
    }
    const nft = await this.nftModel.findById(sale.nftId);
    if (!nft) return this.reject('NFT not found');
    // Mirrors the on-chain check: author cannot buy own token (wash trading prevention)
    if (nft.userId === dto.userId) {
      return this.reject('Buyer is current owner — wash trading rejected');
    }
    return this.approve('Sale is active, buyer is valid');
  }

  private async validateCancel(dto: ValidateOperationDto): Promise<NodeVote> {
    const sale = await this.saleModel.findById(dto.saleId);
    if (!sale) return this.reject(`Sale ${dto.saleId} not found`);
    if (sale.sellerId !== dto.userId) {
      return this.reject('Only the seller can cancel the listing');
    }
    if (sale.status !== SaleStatus.ACTIVE) {
      return this.reject('Sale is not active');
    }
    return this.approve('Seller identity confirmed, cancel is valid');
  }

  private approve(reason: string): NodeVote {
    return { nodeId: this.nodeId, approved: true, reason };
  }

  private reject(reason: string): NodeVote {
    return { nodeId: this.nodeId, approved: false, reason };
  }

  private async askPeer(
    peerUrl: string,
    dto: ValidateOperationDto,
  ): Promise<NodeVote> {
    const response = await fetch(`${peerUrl}/consensus/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
      signal: AbortSignal.timeout(3000), // 3 s timeout per peer
    });

    if (!response.ok) {
      throw new Error(`Peer ${peerUrl} responded with ${response.status}`);
    }

    return response.json() as Promise<NodeVote>;
  }

  getNodeId(): string {
    return this.nodeId;
  }
}
