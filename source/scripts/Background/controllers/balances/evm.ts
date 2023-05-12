import { ethers } from 'ethers';

import { IPaliAccount } from 'state/vault/types';
import { verifyZerosInBalanceAndFormat } from 'utils/verifyZerosInValueAndFormat';

import { IEvmBalanceController } from './types';
import { zerosRepeatingAtStartOfEvmBalance } from './utils';

const EvmBalanceController = (): IEvmBalanceController => {
  const getEvmBalanceForAccount = async (
    currentAccount: IPaliAccount,
    networkUrl: string
  ) => {
    try {
      //LATER CHANGE THIS TO USE NEW PROVIDER FROM SYSWEB3
      const provider = new ethers.providers.JsonRpcProvider(networkUrl);

      const getBalance = await provider.getBalance(currentAccount.address);

      const formattedBalance = ethers.utils.formatEther(getBalance);

      //Validate quantity of zeros in the start of balance to don't how a big 0 decimal number
      return zerosRepeatingAtStartOfEvmBalance(formattedBalance)
        ? '0'
        : verifyZerosInBalanceAndFormat(parseFloat(formattedBalance), 4);
    } catch (error) {
      console.log('error EvmBalanceController', error);

      return String(currentAccount.balances.ethereum);
    }
  };

  return {
    getEvmBalanceForAccount,
  };
};

export default EvmBalanceController;
