import clone from 'lodash/clone';
import sys from 'syscoinjs-lib';

import store from 'state/store';

import { ISysTransaction, ISysTransactionsController } from './types';
import { treatDuplicatedTxs } from './utils';

const SysTransactionController = (): ISysTransactionsController => {
  const getInitialUserTransactionsByXpub = async (
    xpub: string,
    networkUrl: string
  ): Promise<ISysTransaction[]> => {
    try {
      const requestOptions = 'details=txs&pageSize=30';

      const { transactions }: { transactions: ISysTransaction[] } =
        await sys.utils.fetchBackendAccount(
          networkUrl,
          xpub,
          requestOptions,
          true
        );

      return transactions;
    } catch (error) {
      return error;
    }
  };

  const pollingSysTransactions = async (
    xpub: string,
    networkUrl: string
  ): Promise<ISysTransaction[]> => {
    const { accounts, activeAccount, activeNetwork } = store.getState().vault;

    const { transactions: userTransactions } =
      accounts[activeAccount.type][activeAccount.id];

    const getSysTxs = await getInitialUserTransactionsByXpub(xpub, networkUrl);

    const syscoinUserTransactions = clone(userTransactions.syscoin)
      .filter((sysTx) => sysTx.chainId === activeNetwork.chainId)
      .map((tx) => tx.transaction);

    const mergedArrays = [...getSysTxs, ...syscoinUserTransactions];

    return treatDuplicatedTxs(mergedArrays) as ISysTransaction[];
  };

  return {
    getInitialUserTransactionsByXpub,
    pollingSysTransactions,
  };
};

export default SysTransactionController;
