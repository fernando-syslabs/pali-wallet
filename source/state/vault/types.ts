import { ethers } from 'ethers';

import {
  IKeyringAccountState,
  KeyringAccountType,
} from '@pollum-io/sysweb3-keyring';
import { INetwork, INetworkType } from '@pollum-io/sysweb3-network';

import { ITokenEthProps, ITokenSysProps } from 'types/tokens';

export interface IVaultState {
  accounts: { [key in KeyringAccountType]: PaliAccount }; //todo adjust and guarantee type is correct
  activeAccount: {
    id: number;
    type: KeyringAccountType;
  };
  activeChain: INetworkType;
  activeNetwork: INetwork;
  changingConnectedAccount: IChangingConnectedAccount;
  currentBlock: ethers.providers.Block;
  error: boolean;
  hasEthProperty: boolean;
  isBitcoinBased: boolean;
  isLoadingAssets: boolean;
  isLoadingBalances: boolean;
  isLoadingTxs: boolean;
  isNetworkChanging: boolean;
  isPolling: boolean;
  isTimerEnabled: boolean;
  lastLogin: number;
  networks: INetworksVault;
  timer: number;
}

export interface INetworksVault {
  [INetworkType.Ethereum]: {
    [chainId: number]: INetwork;
  };
  [INetworkType.Syscoin]: {
    [chainId: number]: INetwork;
  };
}

export interface IChangingConnectedAccount {
  connectedAccountType: KeyringAccountType | undefined;
  host: string | undefined;
  isChangingConnectedAccount: boolean;
  newConnectedAccount: IKeyringAccountState | undefined;
}

export interface IPaliAccount extends IKeyringAccountState {
  assets: {
    ethereum: ITokenEthProps[];
    syscoin: ITokenSysProps[];
  };
  transactions: any; //TODO: add type
}
export type PaliAccount = {
  [id: number]: IPaliAccount;
};

export type IOmmitedAccount = Omit<IPaliAccount, 'xprv'>;

export type IOmittedVault = Omit<IVaultState, 'accounts'> & {
  accounts: { [id: number]: IOmmitedAccount };
};
