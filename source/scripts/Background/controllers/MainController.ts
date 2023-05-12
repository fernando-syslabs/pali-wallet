import { ethErrors } from 'helpers/errors';
import clone from 'lodash/clone';
import compact from 'lodash/compact';
import isEmpty from 'lodash/isEmpty';
import isNil from 'lodash/isNil';

import {
  KeyringManager,
  IKeyringAccountState,
  KeyringAccountType,
  IWalletState,
} from '@pollum-io/sysweb3-keyring';
import {
  getSysRpc,
  getEthRpc,
  INetwork,
  INetworkType,
} from '@pollum-io/sysweb3-network';

import store from 'state/store';
import {
  forgetWallet as forgetWalletState,
  setActiveAccount,
  setLastLogin,
  setTimer,
  createAccount as addAccountToStore,
  setNetworks,
  removeNetwork as removeNetworkFromStore,
  removeNetwork,
  setStoreError,
  setIsBitcoinBased,
  setChangingConnectedAccount,
  setIsNetworkChanging,
  setIsTimerEnabled as setIsTimerActive,
  setAccounts,
  setNetworkChange,
  setHasEthProperty as setEthProperty,
  setIsLoadingTxs,
  initialState,
  setActiveAccountProperty,
  setIsLoadingAssets,
  setIsLoadingBalances,
  setAccountBalances,
} from 'state/vault';
import { IOmmitedAccount, IPaliAccount } from 'state/vault/types';
import { IMainController } from 'types/controllers';
import { ICustomRpcParams } from 'types/transactions';
import cleanErrorStack from 'utils/cleanErrorStack';

import EthAccountController from './account/evm';
import SysAccountController from './account/syscoin';
import AssetsManager from './assets';
import BalancesManager from './balances';
import ControllerUtils from './ControllerUtils';
import { PaliEvents, PaliSyscoinEvents } from './message-handler/types';
import TransactionsManager from './transactions';
import { IEvmTransactionResponse, ISysTransaction } from './transactions/types';
const MainController = (walletState): IMainController => {
  const keyringManager = new KeyringManager(walletState);
  const utilsController = Object.freeze(ControllerUtils());
  const assetsManager = AssetsManager();
  const transactionsManager = TransactionsManager();
  const balancesMananger = BalancesManager();

  let currentPromise: {
    cancel: () => void;
    promise: Promise<{ chainId: string; networkVersion: number }>;
  } | null = null;

  let _currentPromise: {
    cancel: () => void;
    promise: Promise<void>;
  } | null = null;

  let _2currentPromise: {
    cancel: () => void;
    promise: Promise<void>;
  } | null = null;

  let _3currentPromise: {
    cancel: () => void;
    promise: Promise<void>;
  } | null = null;

  const { verifyIfIsTestnet } = keyringManager;
  const createCancellablePromise = <T>(
    executor: (
      resolve: (value: T) => void,
      reject: (reason?: any) => void
    ) => void
  ): { cancel: () => void; promise: Promise<T> } => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let cancel = () => {};
    const promise: Promise<T> = new Promise((resolve, reject) => {
      cancel = () => {
        reject('Network change cancelled');
      };
      executor(resolve, reject);
    });

    return { promise, cancel };
  };

  const setAutolockTimer = (minutes: number) => {
    store.dispatch(setTimer(minutes));
  };
  const setHasEthProperty = (exist: boolean) => {
    store.dispatch(setEthProperty(exist));
  };

  const getKeyringManager = (): KeyringManager => keyringManager;
  const walletController = {
    account: {
      sys: SysAccountController(getKeyringManager),
      eth: EthAccountController(),
    },
  };

  /** forget your wallet created with pali and associated with your seed phrase,
   *  but don't delete seed phrase so it is possible to create a new
   *  account using the same seed
   */
  const forgetWallet = (pwd: string) => {
    keyringManager.forgetMainWallet(pwd);

    store.dispatch(forgetWalletState());
    store.dispatch(setLastLogin());
  };

  const unlock = async (pwd: string): Promise<boolean> => {
    const unlocked = await keyringManager.unlock(pwd);
    if (!unlocked) throw new Error('Invalid password');
    store.dispatch(setLastLogin());
    //TODO: validate contentScripts flow
    window.controller.dapp
      .handleStateChange(PaliEvents.lockStateChanged, {
        method: PaliEvents.lockStateChanged,
        params: {
          accounts: [],
          isUnlocked: keyringManager.isUnlocked(),
        },
      })
      .catch((error) => console.error('Unlock', error));
    return unlocked;
  };

  const createWallet = async (password: string): Promise<void> => {
    store.dispatch(setIsLoadingBalances(true));

    keyringManager.setWalletPassword(password);

    const account =
      (await keyringManager.createKeyringVault()) as IKeyringAccountState;

    const initialSysAssetsForAccount = await getInitialSysTokenForAccount(
      account.xpub
    );
    //todo: test promise.all to enhance performance
    const initialTxsForAccount = await getInitialSysTransactionsForAccount(
      account.xpub
    );

    const newAccountWithAssets: IPaliAccount = {
      ...account,
      assets: {
        syscoin: initialSysAssetsForAccount,
        ethereum: [],
      },
      transactions: initialTxsForAccount,
    };

    store.dispatch(setIsLoadingBalances(false));
    store.dispatch(
      setActiveAccount({
        id: newAccountWithAssets.id,
        type: KeyringAccountType.HDAccount,
      })
    );
    store.dispatch(
      addAccountToStore({
        account: newAccountWithAssets,
        accountType: KeyringAccountType.HDAccount,
      })
    );
    store.dispatch(setLastLogin());
  };

  const lock = () => {
    keyringManager.logout();

    store.dispatch(setLastLogin());
    window.controller.dapp
      .handleStateChange(PaliEvents.lockStateChanged, {
        method: PaliEvents.lockStateChanged,
        params: {
          accounts: [],
          isUnlocked: keyringManager.isUnlocked(),
        },
      })
      .catch((error) => console.error(error));
    return;
  };

  const setIsAutolockEnabled = (isEnabled: boolean) => {
    store.dispatch(setIsTimerActive(isEnabled));
  };

  const createAccount = async (label?: string): Promise<IPaliAccount> => {
    const newAccount = await keyringManager.addNewAccount(label);

    const initialSysAssetsForAccount = await getInitialSysTokenForAccount(
      newAccount.xpub
    );

    const initialTxsForAccount = await getInitialSysTransactionsForAccount(
      newAccount.xpub
    );

    const newAccountWithAssets: IPaliAccount = {
      ...newAccount,
      assets: {
        syscoin: initialSysAssetsForAccount,
        ethereum: [],
      },
      transactions: initialTxsForAccount,
    };

    store.dispatch(
      addAccountToStore({
        account: newAccountWithAssets,
        accountType: KeyringAccountType.HDAccount,
      })
    );
    store.dispatch(
      setActiveAccount({
        id: newAccountWithAssets.id,
        type: KeyringAccountType.HDAccount,
      })
    );

    return newAccountWithAssets;
  };

  const setAccount = (
    id: number,
    type: KeyringAccountType,
    host?: string,
    connectedAccount?: IOmmitedAccount
  ): void => {
    const { accounts, activeAccount } = store.getState().vault;
    if (
      connectedAccount &&
      connectedAccount.address ===
        accounts[activeAccount.type][activeAccount.id].address
    ) {
      if (connectedAccount.address !== accounts[type][id].address) {
        store.dispatch(
          setChangingConnectedAccount({
            host,
            isChangingConnectedAccount: true,
            newConnectedAccount: accounts[type][id],
            connectedAccountType: type,
          })
        );
        return;
      }
    }

    //TODO: investigate if here would be a ideal place to add balance update
    keyringManager.setActiveAccount(id, type);
    store.dispatch(setActiveAccount({ id, type }));

    getLatestUpdateForCurrentAccount();
  };

  const setActiveNetwork = async (
    network: INetwork,
    chain: string
  ): Promise<{ chainId: string; networkVersion: number }> => {
    let cancelled = false;
    if (currentPromise) {
      currentPromise.cancel();
      cancelled = true;
    }

    const promiseWrapper = createCancellablePromise<{
      activeChain: INetworkType;
      chain: string;
      chainId: string;
      isBitcoinBased: boolean;
      network: INetwork;
      networkVersion: number;
      wallet: IWalletState;
    }>((resolve, reject) => {
      setActiveNetworkLogic(network, chain, cancelled, resolve, reject);
    });
    currentPromise = promiseWrapper;
    promiseWrapper.promise
      .then(async ({ wallet, activeChain, isBitcoinBased }) => {
        store.dispatch(
          setNetworkChange({
            activeChain,
            wallet,
          })
        );
        store.dispatch(setIsBitcoinBased(isBitcoinBased));
        store.dispatch(setIsLoadingBalances(false));
        await utilsController.setFiat();

        updateAssetsFromCurrentAccount();

        updateUserTransactionsState(false);
        window.controller.dapp.handleStateChange(PaliEvents.chainChanged, {
          method: PaliEvents.chainChanged,
          params: {
            chainId: `0x${network.chainId.toString(16)}`,
            networkVersion: network.chainId,
          },
        });

        switch (isBitcoinBased) {
          case true:
            const isTestnet = verifyIfIsTestnet();

            window.controller.dapp.handleStateChange(PaliEvents.isTestnet, {
              method: PaliEvents.isTestnet,
              params: { isTestnet },
            });
            break;
          case false:
            window.controller.dapp.handleStateChange(PaliEvents.isTestnet, {
              method: PaliEvents.isTestnet,
              params: { isTestnet: undefined },
            });
          default:
            break;
        }

        store.dispatch(setIsNetworkChanging(false)); // TODO: remove this , just provisory
        return;
      })
      .catch((reason) => {
        if (reason === 'Network change cancelled') {
          console.error('User asked to switch network - slow connection');
        } else {
          const { activeNetwork, isBitcoinBased } = store.getState().vault;
          window.controller.dapp.handleStateChange(PaliEvents.chainChanged, {
            method: PaliEvents.chainChanged,
            params: {
              chainId: `0x${activeNetwork.chainId.toString(16)}`,
              networkVersion: activeNetwork.chainId,
            },
          });
          window.controller.dapp.handleBlockExplorerChange(
            PaliSyscoinEvents.blockExplorerChanged,
            {
              method: PaliSyscoinEvents.blockExplorerChanged,
              params: isBitcoinBased ? network.url : null,
            }
          );

          switch (isBitcoinBased) {
            case true:
              const isTestnet = verifyIfIsTestnet();

              window.controller.dapp.handleStateChange(PaliEvents.isTestnet, {
                method: PaliEvents.isTestnet,
                params: { isTestnet },
              });
              break;
            case false:
              window.controller.dapp.handleStateChange(PaliEvents.isTestnet, {
                method: PaliEvents.isTestnet,
                params: { isTestnet: undefined },
              });
            default:
              break;
          }
        }
        store.dispatch(setStoreError(true));
        store.dispatch(setIsNetworkChanging(false));
        store.dispatch(setIsLoadingBalances(false));
      });
    return promiseWrapper.promise;
  };
  const setActiveNetworkLogic = async (
    network: INetwork,
    chain: string,
    cancelled: boolean,
    resolve: (value: {
      activeChain: INetworkType;
      chain: string;
      chainId: string;
      isBitcoinBased: boolean;
      network: INetwork;
      networkVersion: number;
      wallet: IWalletState;
    }) => void,
    reject: (reason?: any) => void
  ) => {
    if (store.getState().vault.isNetworkChanging && !cancelled) {
      return;
    }

    store.dispatch(setIsNetworkChanging(true));
    store.dispatch(setIsLoadingBalances(true));

    const isBitcoinBased = chain === INetworkType.Syscoin;

    const { sucess, wallet, activeChain } =
      await keyringManager.setSignerNetwork(network, chain);
    const chainId = network.chainId.toString(16);
    const networkVersion = network.chainId;
    if (sucess) {
      resolve({
        activeChain,
        chain,
        chainId,
        isBitcoinBased,
        network,
        networkVersion,
        wallet,
      });
    } else {
      reject(
        'Pali: fail on setActiveNetwork - keyringManager.setSignerNetwork'
      );
    }
  };

  const removeWindowEthProperty = () => {
    window.controller.dapp.handleStateChange(PaliEvents.removeProperty, {
      method: PaliEvents.removeProperty,
      params: {
        type: PaliEvents.removeProperty,
      },
    });
  };

  const addWindowEthProperty = () => {
    window.controller.dapp.handleStateChange(PaliEvents.addProperty, {
      method: PaliEvents.addProperty,
      params: {
        type: PaliEvents.addProperty,
      },
    });
  };

  const resolveError = () => store.dispatch(setStoreError(false));
  const resolveAccountConflict = () => {
    store.dispatch(
      setChangingConnectedAccount({
        newConnectedAccount: undefined,
        host: undefined,
        isChangingConnectedAccount: false,
        connectedAccountType: undefined,
      })
    );
  };

  const getSeed = (pwd: string) => keyringManager.getSeed(pwd);

  const getRpc = async (data: ICustomRpcParams): Promise<INetwork> => {
    try {
      //todo: need to adjust to get this from keyringmanager syscoin
      const { formattedNetwork } = data.isSyscoinRpc
        ? (await getSysRpc(data)).rpc
        : await getEthRpc(data);

      return formattedNetwork;
    } catch (error) {
      if (!data.isSyscoinRpc) {
        throw cleanErrorStack(ethErrors.rpc.internal());
      }
      throw new Error(
        'Could not add your network, please try a different RPC endpoint'
      );
    }
  };

  const addCustomRpc = async (data: ICustomRpcParams): Promise<INetwork> => {
    const network = await getRpc(data);

    const networkWithCustomParams = {
      ...network,
      apiUrl: data.apiUrl ? data.apiUrl : network.apiUrl,
      currency: data.symbol ? data.symbol : network.currency,
    } as INetwork;

    const chain = data.isSyscoinRpc ? 'syscoin' : 'ethereum';

    store.dispatch(
      setNetworks({ chain, network: networkWithCustomParams, isEdit: false })
    );

    return network;
  };

  const editCustomRpc = async (
    newRpc: ICustomRpcParams,
    oldRpc: ICustomRpcParams
  ): Promise<INetwork> => {
    const changedChainId = oldRpc.chainId !== newRpc.chainId;
    const network = await getRpc(newRpc);
    const chain = newRpc.isSyscoinRpc ? 'syscoin' : 'ethereum';

    if (network.chainId === oldRpc.chainId) {
      const newNetwork = {
        ...network,
        label: newRpc.label,
        currency:
          newRpc.symbol === oldRpc.symbol ? oldRpc.symbol : newRpc.symbol,
        apiUrl: newRpc.apiUrl === oldRpc.apiUrl ? oldRpc.apiUrl : newRpc.apiUrl,
        url: newRpc.url === oldRpc.url ? oldRpc.url : newRpc.url,
        chainId:
          newRpc.chainId === oldRpc.chainId ? oldRpc.chainId : newRpc.chainId,
      } as INetwork;

      if (changedChainId) {
        store.dispatch(
          removeNetwork({
            chainId: oldRpc.chainId,
            prefix: chain,
          })
        );
      }
      store.dispatch(setNetworks({ chain, network: newNetwork, isEdit: true }));
      keyringManager.updateNetworkConfig(newNetwork, chain as INetworkType);

      return newNetwork;
    }
    throw new Error(
      'You are trying to set a different network RPC in current network. Please, verify it and try again'
    );
  };

  const removeKeyringNetwork = (
    chain: INetworkType,
    chainId: number,
    key?: string
  ) => {
    //todo: we need to adjust that to use the right fn since keyring manager does not have this function anymore
    keyringManager.removeNetwork(chain, chainId);

    store.dispatch(removeNetworkFromStore({ prefix: chain, chainId, key }));
  };

  //todo: we need to adjust that to use the right fn since keyring manager does not have this function anymore
  const getChangeAddress = async (accountId: number) =>
    await keyringManager.getChangeAddress(accountId);

  const getRecommendedFee = () => {
    const { isBitcoinBased, activeNetwork } = store.getState().vault;
    if (isBitcoinBased)
      return keyringManager.syscoinTransaction.getRecommendedFee(
        activeNetwork.url
      );
    //TODO: Validate this method call through contentScript
    return keyringManager.ethereumTransaction.getRecommendedGasPrice(true);
  };

  const importAccountFromPrivateKey = async (
    privKey: string,
    label?: string
  ) => {
    const { accounts } = store.getState().vault;
    //todo: this function was renamed we should update it
    const importedAccount = await keyringManager.importAccount(privKey, label);
    const paliImp: IPaliAccount = {
      ...importedAccount,
      assets: {
        ethereum: [],
        syscoin: [],
      },
      transactions: [],
    } as IPaliAccount;
    store.dispatch(
      setAccounts({
        ...accounts,
        [KeyringAccountType.Imported]: {
          ...accounts[KeyringAccountType.Imported],
          [paliImp.id]: paliImp,
        },
      })
    );
    store.dispatch(
      setActiveAccount({ id: paliImp.id, type: KeyringAccountType.Imported })
    );

    return importedAccount;
  };

  // const importTrezorAccount = async (
  //   coin: string,
  //   slip44: string,
  //   index: string
  // ) => {
  //   const { accounts } = store.getState().vault;
  //   //todo: this function was renamed we should update it
  //   const importedAccount = await keyringManager.importTrezorAccount(
  //     coin,
  //     slip44,
  //     index
  //   );
  //   const paliImp: IPaliAccount = {
  //     ...importedAccount,
  //     assets: {
  //       ethereum: [],
  //       syscoin: [],
  //     },
  //     transactions: [],
  //   } as IPaliAccount;
  //   store.dispatch(
  //     setAccounts({
  //       ...accounts,
  //       [KeyringAccountType.Trezor]: {
  //         ...accounts[KeyringAccountType.Trezor],
  //         [paliImp.id]: paliImp,
  //       },
  //     })
  //   );
  //   store.dispatch(
  //     setActiveAccount({ id: paliImp.id, type: KeyringAccountType.Trezor })
  //   );

  //   return importedAccount;
  // };

  //---- SYS METHODS ----//
  const getInitialSysTransactionsForAccount = async (xpub: string) => {
    store.dispatch(setIsLoadingTxs(true));

    const initialTxsForAccount =
      await transactionsManager.sys.getInitialUserTransactionsByXpub(
        xpub,
        initialState.activeNetwork.url
      );

    store.dispatch(setIsLoadingTxs(false));

    return initialTxsForAccount;
  };
  //---- END SYS METHODS ----//

  //---- METHODS FOR UPDATE BOTH TRANSACTIONS ----//
  const callUpdateTxsMethodBasedByIsBitcoinBased = (
    isBitcoinBased: boolean,
    currentAccount: IPaliAccount,
    activeNetworkUrl: string
  ) => {
    switch (isBitcoinBased) {
      case true:
        //IF SYS UTX0 ONLY RETURN DEFAULT TXS FROM XPUB REQUEST

        window.controller.wallet.transactions.sys
          .getInitialUserTransactionsByXpub(
            currentAccount.xpub,
            activeNetworkUrl
          )
          .then((txs) => {
            if (isNil(txs) || isEmpty(txs)) {
              return;
            }
            store.dispatch(setIsLoadingTxs(true));

            store.dispatch(
              setActiveAccountProperty({
                property: 'transactions',
                value: txs,
              })
            );

            store.dispatch(setIsLoadingTxs(false));
          });
        break;
      case false:
        //DO SAME AS POLLING TO DEAL WITH EVM NETWORKS
        transactionsManager.utils
          .updateTransactionsFromCurrentAccount(
            currentAccount,
            isBitcoinBased,
            activeNetworkUrl
          )
          .then((updatedTxs) => {
            if (isNil(updatedTxs) || isEmpty(updatedTxs)) {
              console.log('error 1 while updating tx');
              throw new Error('error while updating tx');
            }
            store.dispatch(setIsLoadingTxs(true));
            store.dispatch(
              setActiveAccountProperty({
                property: 'transactions',
                value: updatedTxs,
              })
            );
            store.dispatch(setIsLoadingTxs(false));
          })
          .catch((e) => {
            console.log('error updating tx2', e);
            throw new Error(e);
          });
        break;

      default:
        break;
    }
  };

  // const updateUserTransactionsState = (isPolling: boolean) => {
  //   const { accounts, activeAccount, activeNetwork, isBitcoinBased } =
  //     store.getState().vault;

  //   const currentAccount = accounts[activeAccount.type][activeAccount.id];

  //   switch (isPolling) {
  //     //CASE FOR POLLING AT ALL -> EVM AND SYS UTX0
  //     case true:
  //       transactionsManager.utils
  //         .updateTransactionsFromCurrentAccount(
  //           currentAccount,
  //           isBitcoinBased,
  //           activeNetwork.url
  //         )
  //         .then((updatedTxs) => {
  //           if (isNil(updatedTxs) || isEmpty(updatedTxs)) {
  //             return;
  //           }
  //           store.dispatch(setIsLoadingTxs(true));
  //           store.dispatch(
  //             setActiveAccountProperty({
  //               property: 'transactions',
  //               value: updatedTxs,
  //             })
  //           );
  //           store.dispatch(setIsLoadingTxs(false));
  //         })
  //         .catch((e) => console.log('updateUserTransactionsState', e));
  //       break;
  //     //DEAL WITH NETWORK CHANGING, CHANGING ACCOUNTS ETC
  //     case false:
  //       callUpdateTxsMethodBasedByIsBitcoinBased(
  //         isBitcoinBased,
  //         currentAccount,
  //         activeNetwork.url
  //       );

  //       break;

  //     default:
  //       break;
  //   }
  // };

  const updateUserTransactionsState = async (isPolling: boolean) => {
    const { accounts, activeAccount, activeNetwork, isBitcoinBased } =
      store.getState().vault;
    const currentAccount = accounts[activeAccount.type][activeAccount.id];

    const { promise, cancel } = createCancellablePromise<void>(
      async (resolve, reject) => {
        try {
          switch (isPolling) {
            //CASE FOR POLLING AT ALL -> EVM AND SYS UTX0
            case true:
              const updatedTxs =
                await transactionsManager.utils.updateTransactionsFromCurrentAccount(
                  currentAccount,
                  isBitcoinBased,
                  activeNetwork.url
                );
              if (!isNil(updatedTxs) && !isEmpty(updatedTxs)) {
                store.dispatch(setIsLoadingTxs(true));
                store.dispatch(
                  setActiveAccountProperty({
                    property: 'transactions',
                    value: updatedTxs,
                  })
                );
                store.dispatch(setIsLoadingTxs(false));
                throw new Error('could not update tx');
              }
              break;
            //DEAL WITH NETWORK CHANGING, CHANGING ACCOUNTS ETC
            case false:
              callUpdateTxsMethodBasedByIsBitcoinBased(
                isBitcoinBased,
                currentAccount,
                activeNetwork.url
              );
              break;
          }
          resolve();
        } catch (error) {
          console.log('reject updateUserTransactionsState');
          reject(error);
        }
      }
    );

    if (_currentPromise) {
      _currentPromise.cancel();
    }

    _currentPromise = { promise, cancel };

    try {
      await promise;
    } catch (error) {
      console.log('catch update tx state');
      throw new Error(error);
    }
  };

  const sendAndSaveTransaction = (
    tx: IEvmTransactionResponse | ISysTransaction
  ) => {
    const { accounts, activeAccount, isBitcoinBased } = store.getState().vault;

    const { transactions: userTransactions } =
      accounts[activeAccount.type][activeAccount.id];

    const txWithTimestamp = {
      ...tx,
      [`${isBitcoinBased ? 'blockTime' : 'timestamp'}`]: Math.floor(
        Date.now() / 1000
      ),
    } as IEvmTransactionResponse & ISysTransaction;

    const clonedArrayToAdd = clone(
      isBitcoinBased
        ? (compact(userTransactions) as ISysTransaction[])
        : (compact(
            Object.values(userTransactions)
          ) as IEvmTransactionResponse[])
    );

    clonedArrayToAdd.unshift(txWithTimestamp);

    store.dispatch(
      setActiveAccountProperty({
        property: 'transactions',
        value: clonedArrayToAdd,
      })
    );
  };
  //---- END METHODS FOR UPDATE BOTH TRANSACTIONS ----//

  //------------------------- END TRANSACTIONS METHODS -------------------------//

  //------------------------- NEW ASSETS METHODS -------------------------//

  //---- SYS METHODS ----//
  const getInitialSysTokenForAccount = async (xpub: string) => {
    store.dispatch(setIsLoadingAssets(true));

    const initialSysAssetsForAccount =
      await assetsManager.sys.getSysAssetsByXpub(
        xpub,
        initialState.activeNetwork.url,
        initialState.activeNetwork.chainId
      );

    store.dispatch(setIsLoadingAssets(false));

    return initialSysAssetsForAccount;
  };
  //---- END SYS METHODS ----//

  //---- METHODS FOR UPDATE BOTH ASSETS ----//
  const updateAssetsFromCurrentAccount = async () => {
    const { isBitcoinBased, accounts, activeAccount, activeNetwork, networks } =
      store.getState().vault;
    const currentAccount = accounts[activeAccount.type][activeAccount.id];

    const { promise, cancel } = createCancellablePromise<void>(
      async (resolve, reject) => {
        try {
          const updatedAssets =
            await assetsManager.utils.updateAssetsFromCurrentAccount(
              currentAccount,
              isBitcoinBased,
              activeNetwork.url,
              activeNetwork.chainId,
              networks
            );
          const validateUpdatedAndPreviousAssetsLength =
            updatedAssets.ethereum.length <
              currentAccount.assets.ethereum.length ||
            updatedAssets.syscoin.length < currentAccount.assets.syscoin.length;

          const validateIfUpdatedAssetsStayEmpty =
            (currentAccount.assets.ethereum.length > 0 &&
              isEmpty(updatedAssets.ethereum)) ||
            (currentAccount.assets.syscoin.length > 0 &&
              isEmpty(updatedAssets.syscoin));

          const validateIfBothUpdatedIsEmpty =
            isEmpty(updatedAssets.ethereum) && isEmpty(updatedAssets.syscoin);

          const validateIfIsInvalidDispatch =
            validateUpdatedAndPreviousAssetsLength ||
            validateIfUpdatedAssetsStayEmpty ||
            validateIfBothUpdatedIsEmpty;

          if (validateIfIsInvalidDispatch) {
            resolve();
            return;
          }

          if (
            !isEmpty(updatedAssets.ethereum) ||
            isEmpty(updatedAssets.syscoin)
          ) {
            console.log('reject');
            reject('failed to update assets');
          }

          store.dispatch(setIsLoadingAssets(true));
          store.dispatch(
            setActiveAccountProperty({
              property: 'assets',
              value: updatedAssets as any, //setActiveAccountProperty only accept any as type
            })
          );
          store.dispatch(setIsLoadingAssets(false));
          resolve();
        } catch (error) {
          console.log('updateAssetsFromCurrentAccount error', error);
          reject(error);
        }
      }
    );

    if (_2currentPromise) {
      _2currentPromise.cancel();
    }

    _2currentPromise = { promise, cancel };

    try {
      console.log('update asset promise');
      await promise;
    } catch (error) {
      console.log('updated asset cancel', error);
      throw new Error(error);
    }
  };
  //---- END METHODS FOR UPDATE BOTH ASSETS ----//

  //------------------------- END ASSETS METHODS -------------------------//

  //------------------------- NEW BALANCES METHODS -------------------------//

  const updateUserNativeBalance = async () => {
    const {
      isBitcoinBased,
      activeNetwork: { url: networkUrl },
      accounts,
      activeAccount,
    } = store.getState().vault;

    const currentAccount = accounts[activeAccount.type][activeAccount.id];

    const { promise, cancel } = createCancellablePromise<void>(
      async (resolve, reject) => {
        try {
          const updatedBalance =
            await balancesMananger.utils.getBalanceUpdatedForAccount(
              currentAccount,
              isBitcoinBased,
              networkUrl
            );

          const actualUserBalance = isBitcoinBased
            ? currentAccount.balances.syscoin
            : currentAccount.balances.ethereum;
          const validateIfCanDispatch = Boolean(
            Number(actualUserBalance) !== parseFloat(updatedBalance)
          );

          if (validateIfCanDispatch) {
            store.dispatch(setIsLoadingBalances(true));
            store.dispatch(
              setAccountBalances({
                ...currentAccount.balances,
                [isBitcoinBased ? INetworkType.Syscoin : INetworkType.Ethereum]:
                  updatedBalance,
              })
            );
            store.dispatch(setIsLoadingBalances(false));
          } else {
            throw new Error('could not update user native balance');
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      }
    );

    if (_3currentPromise) {
      _3currentPromise.cancel();
    }

    _3currentPromise = { promise, cancel };

    try {
      await promise;
    } catch (error) {
      throw new Error(error);
    }
  };

  //---- New method to update some infos from account like Assets, Txs etc ----//
  const getLatestUpdateForCurrentAccount = () => {
    const { isNetworkChanging, accounts, activeAccount } =
      store.getState().vault;

    const activeAccountValues = accounts[activeAccount.type][activeAccount.id];

    if (isNetworkChanging || isNil(activeAccountValues.address)) return;

    new Promise<void>((resolve) => {
      try {
        //First update native balance
        updateUserNativeBalance();
        //Later update Txs
        updateUserTransactionsState(false);
        //Later update Assets
        updateAssetsFromCurrentAccount();

        resolve();
      } catch (e) {
        console.log('error get latest update for current account', e);
      }
    });

    return;
  };

  return {
    createWallet,
    forgetWallet,
    unlock, //todo we need to adjust unlock type
    lock,
    createAccount,
    account: walletController.account,
    setAccount,
    setAutolockTimer,
    setActiveNetwork,
    addCustomRpc,
    setIsAutolockEnabled,
    getRpc,
    getSeed,
    editCustomRpc,
    removeKeyringNetwork,
    resolveAccountConflict,
    resolveError,
    getChangeAddress,
    getRecommendedFee,
    assets: assetsManager,
    transactions: transactionsManager,
    sendAndSaveTransaction,
    updateAssetsFromCurrentAccount,
    updateUserNativeBalance,
    updateUserTransactionsState,
    getLatestUpdateForCurrentAccount,
    importAccountFromPrivateKey,
    removeWindowEthProperty,
    addWindowEthProperty,
    setHasEthProperty,
    // importTrezorAccount,
    ...keyringManager,
  };
};

export default MainController;
