import { ethers } from 'ethers';

import { INetworksVault, IPaliAccount } from 'state/vault/types';
import { ITokenEthProps, ITokenSysProps } from 'types/tokens';

// SYS TYPES

export interface IAssetsManager {
  evm: IEvmAssetsController;
  sys: ISysAssetsController;
  utils: IAssetsManagerUtils;
}

export interface IAssetsManagerUtilsResponse {
  ethereum: ITokenEthProps[];
  syscoin: ITokenSysProps[];
}
export interface IAssetsManagerUtils {
  updateAssetsFromCurrentAccount: (
    currentAccount: IPaliAccount,
    isBitcoinBased: boolean,
    activeNetworkUrl: string,
    networkChainId: number,
    networks: INetworksVault
  ) => Promise<IAssetsManagerUtilsResponse>;
}
export interface ISysAssetsController {
  addSysDefaultToken: (
    assetGuid: string,
    networkUrl: string
  ) => Promise<boolean | ITokenSysProps>;
  getSysAssetsByXpub: (
    xpub: string,
    networkUrl: string,
    networkChainId: number
  ) => Promise<ISysTokensAssetReponse[]>;
}

export interface ISysTokensAssetReponse {
  assetGuid: string;
  balance: number;
  chainId?: number;
  decimals: number;
  name: string;
  path: string;
  symbol: string;
  totalReceived: string;
  totalSent: string;
  transfers: number;
  type: string;
}

// EVM TYPES
export interface IAddCustomTokenResponse {
  error: boolean;
  errorType?: string;
  message?: string;
  tokenToAdd?: ITokenEthProps;
}

export interface IEvmAssetsController {
  addCustomTokenByType: (
    walletAddres: string,
    contractAddress: string,
    symbol: string,
    decimals: number,
    provider: ethers.providers.JsonRpcProvider
  ) => Promise<IAddCustomTokenResponse>;
  addEvmDefaultToken: (
    token: ITokenEthProps,
    accountAddress: string,
    networkUrl: string
  ) => Promise<ITokenEthProps | boolean>;
  updateAllEvmTokens: (
    account: IPaliAccount,
    networks: INetworksVault
  ) => Promise<ITokenEthProps[]>;
}
