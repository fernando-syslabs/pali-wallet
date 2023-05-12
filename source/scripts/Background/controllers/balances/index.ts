import { IPaliAccount } from 'state/vault/types';

import EvmBalanceController from './evm';
import SyscoinBalanceController from './syscoin';
import { IBalancesManager } from './types';

const BalancesManager = (): IBalancesManager => {
  const getBalanceUpdatedForAccount = async (
    currentAccount: IPaliAccount,
    isBitcoinBased: boolean,
    networkUrl: string
  ) => {
    switch (isBitcoinBased) {
      case true:
        try {
          const getSysBalance =
            await SyscoinBalanceController().getSysBalanceForAccount(
              currentAccount,
              networkUrl
            );

          return getSysBalance;
        } catch (sysBalanceError) {
          return sysBalanceError;
        }
      case false:
        try {
          const getEvmBalance =
            await EvmBalanceController().getEvmBalanceForAccount(
              currentAccount,
              networkUrl
            );

          console.log('evm balance', getEvmBalance);
          if (!getEvmBalance) {
            throw new Error('couldnt get balance');
          }
          return getEvmBalance;
        } catch (evmBalanceError) {
          console.log('balance evmUpdateError');

          throw new Error(evmBalanceError);
        }
    }
  };

  return {
    evm: EvmBalanceController(),
    sys: SyscoinBalanceController(),
    utils: {
      getBalanceUpdatedForAccount,
    },
  };
};

export default BalancesManager;
