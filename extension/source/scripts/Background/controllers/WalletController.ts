import { generateMnemonic, validateMnemonic } from 'bip39';
import store from 'state/store';
import {
  setKeystoreInfo,
  deleteWallet as deleteWalletState,
  changeAccountActiveId,
  changeActiveNetwork,
  updateStatus,
  setEncriptedMnemonic
} from 'state/wallet';
import AccountController, { IAccountController } from './AccountController';
import IWalletState, { Keystore } from 'state/wallet/types';
import { sys,SYS_NETWORK } from 'constants/index';
import CryptoJS from 'crypto-js';
// import {sys, SYS_NETWORK} from '../../../constants'
// import {SyscoinJSLib} from 'syscoinjs-lib';
// import {HDSigner} from 'syscoinjs-lib/utils';
export interface IWalletController {
  account: Readonly<IAccountController>;
  setWalletPassword: (pwd: string) => void;
  isLocked: () => boolean;
  generatePhrase: () => string | null;
  createWallet: (isUpdated?: boolean) => void;
  unLock: (pwd: string) => boolean;
  checkPassword: (pwd: string) => boolean;
  getPhrase: (pwd: string) => string | null;
  deleteWallet: (pwd: string) => void;
  importPhrase: (phr: string) => boolean;
  switchWallet: (id: number) => void;
  switchNetwork: (networkId: string) => void;
  logOut: () => void;
}

const WalletController = (): IWalletController => {
  let password = '';
  let mnemonic = '';
  let HDsigner: any = null;
  let sjs: any = null;
  let backendURl = SYS_NETWORK.testnet.beUrl;

  const setWalletPassword = (pwd: string) => {
    password = pwd;
  };

  const isLocked = () => {
    return !password || !mnemonic;
  };

  const generatePhrase = () => {
    if (retrieveEncriptedMnemonic()) {
      return null;
    }

    if (!mnemonic) mnemonic = generateMnemonic();
    return mnemonic;
  };

  const createWallet = (isUpdated = false) => {
    // if (!isUpdated && seedWalletKeystore()) {
    //   return;
    // }
    if (!isUpdated && sjs !== null) {
      return
    }
    HDsigner = new sys.utils.HDSigner(mnemonic, password, true)
    sjs = new sys.SyscoinJSLib(HDsigner, backendURl)
    if (HDsigner.accountIndex > 0) {
      throw new Error("account index is bigger then 0 logic inconsistency")
    }
    // if (isUpdated) {
    //   //logic for import seed phrase
    //   const { seedKeystoreId, keystores } = store.getState().wallet;

    //   if (seedKeystoreId > -1 && keystores[seedKeystoreId]) {
    //     store.dispatch(removeSeedAccounts());
    //   }
    // }

    const encryptedMnemonic = CryptoJS.AES.encrypt(mnemonic, password)
    store.dispatch(setEncriptedMnemonic(encryptedMnemonic));
    console.log("The accounts on HDsigner:", HDsigner.accounts)
    account.subscribeAccount(HDsigner, backendURl);
    account.getPrimaryAccount(password);

    if (isUpdated) {
      account.getLatestUpdate();
    }
  };

  // const seedWalletKeystore = () => {
  //   const { keystores, seedKeystoreId }: IWalletState = store.getState().wallet;

  //   return keystores && seedKeystoreId > -1 && keystores[seedKeystoreId]
  //     ? keystores[seedKeystoreId]
  //     : null;
  // };

  const retrieveEncriptedMnemonic = () => {
    // not encrypted for now but we got to retrieve
    const { encriptedMnemonic }: IWalletState = store.getState().wallet
    // const { keystores, seedKeystoreId }: IWalletState = store.getState().wallet;

    return encriptedMnemonic != ''
      ? encriptedMnemonic
      : null;
  };
  const checkPassword = (pwd: string) => {
    return password === pwd;
  };

  const getPhrase = (pwd: string) => {
    return checkPassword(pwd) ? mnemonic : null;
  };

  const unLock = (pwd: string): boolean => {
    try {
      const encriptedMnemonic = retrieveEncriptedMnemonic();
      //add unencript password 
      console.log("The hash", encriptedMnemonic)
      const decriptedMnemonic = CryptoJS.AES.decrypt(encriptedMnemonic, pwd).toString(CryptoJS.enc.Utf8); //add unencript password 
      if (!decriptedMnemonic) {
        throw new Error('password wrong');
      }
      if (HDsigner != null) {
        console.log('well well well')
      }
      else {
        HDsigner = new sys.utils.HDSigner(mnemonic, pwd, true)
        console.log('HDsigner retrieved')
      }

      password = pwd;
      mnemonic = decriptedMnemonic;

      account.getPrimaryAccount(password);
      account.watchMemPool();

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  const deleteWallet = (pwd: string) => {
    if (checkPassword(pwd)) {
      password = '';
      mnemonic = '';

      store.dispatch(deleteWalletState());
      store.dispatch(updateStatus());
    }
  };

  const importPhrase = (seedphrase: string) => {

    if (validateMnemonic(seedphrase)) {
      mnemonic = seedphrase
      return true;
    }

    return false;
  };

  const switchWallet = (id: number) => {
    store.dispatch(changeAccountActiveId(id));
    account.getLatestUpdate();
  };

  const logOut = () => {
    password = '';
    mnemonic = '';
    store.dispatch(updateStatus());
  };

  const importPrivKey = (privKey: string) => {
    const { keystores }: IWalletState = store.getState().wallet;

    if (isLocked() || !privKey) {
      return null;
    }

    const newKeystoreImportAccount: Keystore = {
      id: 0,
      address: 'address-newkeystore-imported',
      phrase: mnemonic
    }

    if (keystores.filter((keystore) => (keystore as Keystore).address === (newKeystoreImportAccount as Keystore).address).length) {
      return null;
    }

    store.dispatch(setKeystoreInfo(newKeystoreImportAccount));
    return newKeystoreImportAccount;
  };

  const switchNetwork = (networkId: string) => {
    if (SYS_NETWORK[networkId]!.id) {
      // set network here (syscoin set network)
      store.dispatch(changeActiveNetwork(SYS_NETWORK[networkId]!.id));
      account.getLatestUpdate();
    }
  };

  const account = AccountController({ checkPassword, importPrivKey });

  return {
    account,
    isLocked,
    setWalletPassword,
    generatePhrase,
    createWallet,
    checkPassword,
    getPhrase,
    deleteWallet,
    importPhrase,
    unLock,
    switchWallet,
    switchNetwork,
    logOut,
  };
};

export default WalletController;