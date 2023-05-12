import 'emoji-log';
import { wrapStore } from 'webext-redux';
import { browser, Runtime } from 'webextension-polyfill-ts';

import { STORE_PORT } from 'constants/index';
import store from 'state/store';
import { log } from 'utils/logger';

import MasterController, { IMasterController } from './controllers';

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    controller: Readonly<IMasterController>;
  }
}
let paliPort: Runtime.Port;
const onWalletReady = (windowController: IMasterController) => {
  // Add any code here that depends on the initialized wallet
  window.controller = windowController;
  setInterval(window.controller.utils.setFiat, 3 * 60 * 1000);
  if (paliPort) {
    window.controller.dapp.setup(paliPort);
  }
  window.controller.utils.setFiat();
};

if (!window.controller) {
  window.controller = MasterController(onWalletReady);
  // setInterval(window.controller.utils.setFiat, 3 * 60 * 1000);
}

browser.runtime.onInstalled.addListener(() => {
  console.emoji('🤩', 'Pali extension enabled');
});

let timeout: any;

const restartLockTimeout = () => {
  const { timer } = store.getState().vault;

  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(() => {
    handleLogout();
  }, timer * 60 * 1000);
};

const handleIsOpen = (isOpen: boolean) =>
  window.localStorage.setItem('isPopupOpen', JSON.stringify({ isOpen }));
const handleLogout = () => {
  const { isTimerEnabled } = store.getState().vault; // We need this because movement listner will refresh timeout even if it's disabled
  if (isTimerEnabled) {
    window.controller.wallet.lock();

    window.location.replace('/');
  }
};

browser.runtime.onMessage.addListener(async ({ type, target }) => {
  if (type === 'reset_autolock' && target === 'background') {
    restartLockTimeout();
  }
});

export const inactivityTime = () => {
  const resetTimer = () => {
    browser.runtime.sendMessage({
      type: 'reset_autolock',
      target: 'background',
    });
  };

  // DOM Events
  const events = [
    'onmousemove',
    'onkeydown',
    'onload',
    'onmousedown',
    'ontouchstart',
    'onclick',
    'onkeydown',
  ];

  events.forEach((event) => (document[event] = resetTimer));
};

browser.runtime.onConnect.addListener(async (port: Runtime.Port) => {
  if (port.name === 'pali') handleIsOpen(true);
  if (port.name === 'pali-inject') {
    if (window.controller?.dapp) {
      window.controller.dapp.setup(port);
    }
    paliPort = port;
    return;
  }
  const { changingConnectedAccount, timer, isTimerEnabled } =
    store.getState().vault;

  if (timeout) clearTimeout(timeout);

  if (isTimerEnabled) {
    timeout = setTimeout(() => {
      handleLogout();
    }, timer * 60 * 1000);
  }

  if (changingConnectedAccount.isChangingConnectedAccount)
    window.controller.wallet.resolveAccountConflict();

  const senderUrl = port.sender.url;

  if (
    senderUrl?.includes(browser.runtime.getURL('/app.html')) ||
    senderUrl?.includes(browser.runtime.getURL('/external.html'))
  ) {
    // window.controller.utils.setFiat();

    port.onDisconnect.addListener(() => {
      handleIsOpen(false);
      if (timeout) clearTimeout(timeout);
      if (isTimerEnabled) {
        timeout = setTimeout(() => {
          handleLogout();
        }, timer * 60 * 1000);
      }
      log('pali disconnecting port', 'System');
    });
  }
});
// let intervalId;
let isListenerRegistered = false;
let pollingTimer = 15000; // initial polling time in milliseconds
// const pollingRetryTime = 60000; // time to wait before retrying after an error in milliseconds

// async function checkForUpdates() {
//   const {
//     changingConnectedAccount: { isChangingConnectedAccount },
//     isLoadingAssets,
//     isLoadingBalances,
//     isLoadingTxs,
//     isNetworkChanging,
//   } = store.getState().vault;

//   const notValidToRunPolling =
//     isChangingConnectedAccount ||
//     isLoadingAssets ||
//     isLoadingBalances ||
//     isLoadingTxs ||
//     isNetworkChanging;

//   if (notValidToRunPolling) {
//     //todo: do we also need to return if walle is unlocked?
//     return;
//   }

//   try {
//     console.log('polling started');
//     //Method that update Balances for current user based on isBitcoinBased state ( validated inside )
//     window.controller.wallet.updateUserNativeBalance();

//     //Method that update TXs for current user based on isBitcoinBased state ( validated inside )
//     window.controller.wallet.updateUserTransactionsState(true);

//     //Method that update Assets for current user based on isBitcoinBased state ( validated inside )
//     window.controller.wallet.updateAssetsFromCurrentAccount();

//     // reset polling time to initial value on success
//     pollingTime = 15000;
//   } catch (error) {
//     console.error(error);

//     // increase polling time on error
//     pollingTime = pollingRetryTime;
//   }
// }

// function registerListener() {
//   if (isListenerRegistered) {
//     return;
//   }

//   browser.runtime.onConnect.addListener((port) => {
//     let isPolling = false;

//     if (port.name === 'polling') {
//       port.onMessage.addListener((message) => {
//         if (message.action === 'startPolling' && !isPolling) {
//           isPolling = true;
//           intervalId = setInterval(checkForUpdates, pollingTime);
//           port.postMessage({ intervalId });
//         } else if (message.action === 'stopPolling') {
//           clearInterval(intervalId);
//           isPolling = false;
//         }
//       });
//     }
//   });

//   isListenerRegistered = true;
// }

// registerListener();

const pollingRetryTime = 60000; // time to wait before retrying after an error in milliseconds
let intervalId; // variable to hold the interval ID
let isPolling = false; // variable to keep track of whether polling is currently active

async function checkForUpdates(port) {
  const {
    changingConnectedAccount: { isChangingConnectedAccount },
    isLoadingAssets,
    isLoadingBalances,
    isLoadingTxs,
    isNetworkChanging,
  } = store.getState().vault;

  const notValidToRunPolling =
    isChangingConnectedAccount ||
    isLoadingAssets ||
    isLoadingBalances ||
    isLoadingTxs ||
    isNetworkChanging ||
    isPolling;

  if (notValidToRunPolling) {
    //todo: do we also need to return if walle is unlocked?
    return;
  }

  try {
    console.log('polling started');
    //Method that update Balances for current user based on isBitcoinBased state ( validated inside )
    Promise.all([
      window.controller.wallet.updateUserNativeBalance(),

      //Method that update TXs for current user based on isBitcoinBased state ( validated inside )
      window.controller.wallet.updateUserTransactionsState(true),

      //Method that update Assets for current user based on isBitcoinBased state ( validated inside )
      window.controller.wallet
        .updateAssetsFromCurrentAccount()
        .catch((e) => console.log('background e', e)),
    ]);

    // reset polling time to initial value on success
    pollingTimer = 15000;
  } catch (error) {
    console.error('polling error', error);

    // increase polling time on error
    pollingTimer = pollingRetryTime;

    if (error.response && error.response.status === 429) {
      console.log('429 detected, stopping polling');
      clearInterval(intervalId);
      isPolling = false;
    }
  }

  if (port && isPolling) {
    port.postMessage({ action: 'continuePolling' });
  }
}

function registerListener() {
  if (isListenerRegistered) {
    return;
  }

  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'polling') {
      port.onMessage.addListener(async (message) => {
        try {
          if (message.action === 'startPolling' && !isPolling) {
            isPolling = true;
            intervalId = setInterval(async () => {
              try {
                await checkForUpdates(port);
              } catch (error) {
                console.error(error);
              }
            }, pollingTimer);
            port.postMessage({ intervalId });
          } else if (message.action === 'stopPolling') {
            clearInterval(intervalId);
            isPolling = false;
          }
        } catch (error) {
          console.error(error);
        }
      });
    }
  });

  isListenerRegistered = true;
}

registerListener();

const port = browser.runtime.connect(undefined, { name: 'polling' });
port.postMessage({ action: 'startPolling' });

wrapStore(store, { portName: STORE_PORT });
