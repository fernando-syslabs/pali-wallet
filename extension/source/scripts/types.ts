export type Transaction = {
  txid: string;
  value: number;
  confirmations: number;
  fees: number;
  blockTime: number;
  tokenType: string;
}

export type Assets = {
  type: string;
  assetGuid: number;
  symbol: string;
  balance: number;
  decimals: number
}

export interface IAccountInfo {
  balance: number;
  assets: Assets[];
  transactions: Transaction[];
  address?: string;
}

export interface ITransactionInfo {
  fromAddress: string;
  toAddress: string;
  amount: number;
  fee: number;
  token: Assets | null;
  isToken: boolean;
  rbf: boolean;
}

export interface ISPTInfo {
  precision: number,
  symbol: string,
  maxsupply: number,
  fee: number,
  description: string,
  receiver: string,
  rbf: boolean
}

export interface ISPTPageInfo {
  precision: number,
  symbol: string,
  maxsupply: number,
  description: string,
  receiver: string,
}

export interface ISPTWalletInfo {
  fee: number,
  rbf: boolean
}

export interface ISPTIssue {
  assetGuid: string,
  amount: number,
  fee: number,
  rbf: boolean
}

export interface ISPTIssuePage {
  assetGuid: string,
  amount: number,
}

export interface ISPTIssueWallet {
  fee: number,
  rbf: boolean
}

export interface INFTIssue {
  assetGuid: string,
  fee: number,
  rbf: boolean
}

export interface INFTPageInfo {
  assetGuid: string,
}

export interface INFTWalletInfo {
  fee: number;
  rbf: boolean;
}

export type PendingTx = {
  txid: string;
  value: number;
  confirmations: number;
  fees: number;
  blockTime: number;
}

export type MintedToken = {
  assetGuid: string;
  symbol: string;
  maxSupply: number,
  totalSupply: number
}

export type UpdateToken = {
  assetGuid: string;
  contract?: string | null;
  capabilityflags?: number | 127;
  receiver?: string;
  description: string | '';
  supply?: number;
  notaryAddress?: string;
  notarydetails?: {
    endpoint?: string;
    instanttransfers?: boolean;
    hdrequired?: boolean;
  }
  auxfeedetails?: any;
  // {
  //   auxfeekeyid: Buffer,
  //   auxfees: [
  //     {
  //       bound: any | 0,
  //       percent: any | 0
  //     }
  //   ]
  // };
  notarykeyid?: string;
  fee: number;
  rbf: boolean;
  assetWhiteList?: any | null
}

export interface UpdateTokenPageInfo {
  contract?: string;
  capabilityflags?: number | 127;
  receiver?: string;
  description: string | '';
  notarydetails?: {
    endpoint?: string;
    instanttransfers?: boolean;
    hdrequired?: boolean;
  }
  auxfeedetails?: {
    auxfeekeyid?: any,
    auxfees?: [
      {
        bound?: any | 0,
        percent?: any | 0
      }
    ]
  };
  notarykeyid?: string;
  assetWhiteList?: any | null
}

export interface UpdateTokenWalletInfo {
  fee: number;
  rbf: boolean;
}