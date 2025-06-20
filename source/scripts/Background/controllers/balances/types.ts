import {
  CustomJsonRpcProvider,
  CustomL2JsonRpcProvider,
  IKeyringAccountState,
} from '@pollum-io/sysweb3-keyring';

export interface IEvmBalanceController {
  getEvmBalanceForAccount: (
    currentAccount: IKeyringAccountState
  ) => Promise<string>;
}

export interface ISysBalanceController {
  getSysBalanceForAccount: (
    currentAccount: IKeyringAccountState,
    networkUrl: string
  ) => Promise<string>;
}

export interface IBalancesManagerUtils {
  getBalanceUpdatedForAccount: (
    currentAccount: IKeyringAccountState,
    isBitcoinBased: boolean,
    networkUrl: string,
    provider: CustomJsonRpcProvider | CustomL2JsonRpcProvider
  ) => Promise<string>;
}

export interface IBalancesManager {
  sys: ISysBalanceController;
  utils: IBalancesManagerUtils;
}
