import { AnyAction, Store } from 'redux';

import { KeyringAccountType } from '@pollum-io/sysweb3-keyring';
import { INftsStructure } from '@pollum-io/sysweb3-utils';

import { IDAppState } from 'state/dapp/types';
import { loadState } from 'state/paliStorage';
import { IPriceState } from 'state/price/types';
import { rehydrateStore } from 'state/rehydrate';
import store from 'state/store';
import {
  setAccountTypeInAccountsObject,
  setActiveNetwork,
  setIsLastTxConfirmed,
  setAccountAssets,
} from 'state/vault';
import { selectActiveAccount } from 'state/vault/selectors';
import { IVaultState, IGlobalState, TransactionsType } from 'state/vault/types';
import {
  setAdvancedSettings,
  setNetwork,
  setNetworks,
} from 'state/vaultGlobal';
import { IDAppController } from 'types/controllers';
import {
  ROLLUX_DEFAULT_NETWORK,
  SYSCOIN_MAINNET_DEFAULT_NETWORK,
  CHAIN_IDS,
  PALI_NETWORKS_STATE,
} from 'utils/constants';

import DAppController from './DAppController';
import MainController from './MainController';

export interface IMasterController {
  appRoute: (newRoute?: string, external?: boolean) => string;
  callGetLatestUpdateForAccount: (isPolling?: boolean) => Promise<boolean>;
  createPopup: (
    route?: string,
    data?: object
  ) => Promise<chrome.windows.Window>;
  dapp: Readonly<IDAppController>;
  refresh: () => void;
  rehydrate: () => void;
  wallet: MainController;
}

const MasterController = (
  externalStore: Store<
    {
      dapp: IDAppState;
      price: IPriceState;
      vault: IVaultState;
      vaultGlobal: IGlobalState;
    },
    AnyAction
  >
): IMasterController => {
  let route = '/';
  let externalRoute = '/';
  let wallet: MainController;
  let dapp: Readonly<IDAppController>;

  const initializeMainController = () => {
    const vaultState = externalStore.getState().vault;
    const vaultGlobalState = externalStore.getState().vaultGlobal;

    // Initialize networks in vaultGlobal if they don't exist
    if (!vaultGlobalState.networks) {
      console.log('[MasterController] Initializing networks in vaultGlobal');
      // Initialize with all default networks at once
      externalStore.dispatch(setNetworks(PALI_NETWORKS_STATE));
    }

    // Check if NFTs structure exists in accountAssets
    const needsNftsInit = Object.entries(vaultState.accountAssets ?? {}).some(
      ([, accounts]) =>
        Object.entries(accounts).some(([, assets]) => !assets.nfts)
    );

    if (needsNftsInit) {
      // Initialize NFTs array for any accounts missing it
      Object.entries(vaultState.accountAssets).forEach(([, accounts]) => {
        Object.entries(accounts).forEach(([accountId, assets]) => {
          if (!assets.nfts) {
            externalStore.dispatch(
              setAccountAssets({
                accountId: Number(accountId),
                accountType: KeyringAccountType.HDAccount,
                property: 'nfts',
                value: [] as INftsStructure[],
              })
            );
          }
        });
      });
    }

    // Now safely check for specific networks
    const globalNetworks = externalStore.getState().vaultGlobal.networks;

    if (
      !globalNetworks ||
      !globalNetworks[TransactionsType.Ethereum] ||
      !globalNetworks[TransactionsType.Ethereum][CHAIN_IDS.ROLLUX_MAINNET]
    ) {
      externalStore.dispatch(setNetwork(ROLLUX_DEFAULT_NETWORK));
    }

    const currentRpcSysUtxoMainnet =
      globalNetworks &&
      globalNetworks[TransactionsType.Syscoin] &&
      globalNetworks[TransactionsType.Syscoin][CHAIN_IDS.SYSCOIN_MAINNET];

    const { activeNetwork } = externalStore.getState().vault;

    if (
      currentRpcSysUtxoMainnet &&
      currentRpcSysUtxoMainnet.url !==
        SYSCOIN_MAINNET_DEFAULT_NETWORK.network.url
    ) {
      externalStore.dispatch(setNetwork(SYSCOIN_MAINNET_DEFAULT_NETWORK));
    }

    const DEPRECATED_RPC_PATTERN = 'blockbook.elint.services';
    const isSysUtxoMainnetWithDeprecatedRpc =
      activeNetwork?.chainId === CHAIN_IDS.SYSCOIN_MAINNET &&
      activeNetwork?.url?.includes(DEPRECATED_RPC_PATTERN);

    if (isSysUtxoMainnetWithDeprecatedRpc) {
      externalStore.dispatch(
        setActiveNetwork(SYSCOIN_MAINNET_DEFAULT_NETWORK.network)
      );
    }

    const isNetworkOldState =
      (globalNetworks &&
        globalNetworks[TransactionsType.Ethereum] &&
        globalNetworks[TransactionsType.Ethereum][CHAIN_IDS.ETHEREUM_MAINNET]
          ?.default) ??
      false;

    if (isNetworkOldState) {
      Object.values(PALI_NETWORKS_STATE.ethereum).forEach((network) => {
        externalStore.dispatch(
          setNetwork({
            network: network,
          })
        );
      });
    }

    if (externalStore.getState().vault?.accounts?.Ledger === undefined) {
      externalStore.dispatch(
        setAccountTypeInAccountsObject(KeyringAccountType.Ledger)
      );
    }
    if (externalStore.getState().vaultGlobal?.advancedSettings === undefined) {
      externalStore.dispatch(
        setAdvancedSettings({
          advancedProperty: 'refresh',
          value: false,
          isFirstTime: true,
        })
      );
      externalStore.dispatch(
        setAdvancedSettings({
          advancedProperty: 'ledger',
          value: false,
          isFirstTime: true,
        })
      );
    }

    if (!externalStore.getState().vault?.isLastTxConfirmed) {
      externalStore.dispatch(
        setIsLastTxConfirmed({
          chainId: 0,
          wasConfirmed: false,
          isFirstTime: true,
        })
      );
    }
    dapp = Object.freeze(DAppController());
    wallet = new MainController();

    // Initialize startup state if wallet is already unlocked
    wallet.initializeStartupState();
  };

  const callGetLatestUpdateForAccount = async (isPolling?: boolean) =>
    wallet.getLatestUpdateForCurrentAccount(isPolling);

  const refresh = () => {
    const vaultState = externalStore.getState().vault;
    const activeAccount = selectActiveAccount({ vault: vaultState } as any);
    if (!activeAccount?.address) return;
    callGetLatestUpdateForAccount();
  };

  /**
   * Determine which is the app route
   * @returns the proper route
   */
  const appRoute = (newRoute?: string, external = false) => {
    if (newRoute) {
      if (external) externalRoute = newRoute;
      else route = newRoute;
    }
    return external ? externalRoute : route;
  };

  /**
   * Creates a popup for external routes. Mostly for DApps
   * @returns the window object from the popup
   */
  const createPopup = async (
    popUpRoute = '',
    data = {}
  ): Promise<chrome.windows.Window> =>
    new Promise((resolve, reject) => {
      chrome.windows.getCurrent((window) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        if (!window || !window.width) {
          reject(new Error('No window available'));
          return;
        }

        const params = new URLSearchParams();
        if (popUpRoute) params.append('route', popUpRoute);
        if (data) params.append('data', JSON.stringify(data));

        chrome.windows.create(
          {
            url: '/external.html?' + params.toString(),
            width: 400,
            height: 620,
            type: 'popup',
          },
          (newWindow) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(newWindow!);
            }
          }
        );
      });
    });

  const rehydrate = async () => {
    const storageState = await loadState();
    const activeSlip44 = storageState?.vaultGlobal?.activeSlip44;

    console.log(`[MasterController] Rehydrating with slip44: ${activeSlip44}`);
    await rehydrateStore(store, undefined, activeSlip44);
  };

  initializeMainController();

  return {
    rehydrate,
    appRoute,
    createPopup,
    dapp,
    refresh,
    callGetLatestUpdateForAccount,
    wallet,
  };
};

export default MasterController;
