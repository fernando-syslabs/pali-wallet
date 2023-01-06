import { PaliInpageProvider } from './paliProvider';
import { shimWeb3 } from './shimWeb3';
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Read files in as strings
declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    SUPPORTED_WALLET_METHODS: Readonly<any>;
    ethereum: Readonly<any>;
    pali: Readonly<any>;
  }
}
const ethereumProvider = new PaliInpageProvider('ethereum');
const proxiedProvider = new Proxy(ethereumProvider, {
  // some common libraries, e.g. web3@1.x, mess with our API
  deleteProperty: () => true,
});
window.pali = new PaliInpageProvider('syscoin');
window.ethereum = proxiedProvider;
shimWeb3(proxiedProvider);
// window.beterraba = new PaliInpageProvider('ethereum');

export const { SUPPORTED_WALLET_METHODS } = window;
