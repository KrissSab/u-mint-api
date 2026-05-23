export enum OperationType {
  MINT = 'mint',
  LIST = 'list',
  BUY = 'buy',
  CANCEL = 'cancel',
}

export class ValidateOperationDto {
  operation: OperationType;
  // NFT tokenId on-chain
  tokenId: string;
  // DB id of the NFT document
  nftId: string;
  // userId performing the action
  userId: string;
  // price in ETH (for LIST and BUY)
  price?: number;
  // saleId (for BUY / CANCEL)
  saleId?: string;
}

export interface NodeVote {
  nodeId: string;
  approved: boolean;
  reason: string;
}

export interface ConsensusResult {
  consensus: boolean;
  totalNodes: number;
  approvedVotes: number;
  requiredVotes: number;
  votes: NodeVote[];
}
