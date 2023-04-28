import { Disclosure } from '@headlessui/react';
import React, { FC, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { validateEthRpc, validateSysRpc } from '@pollum-io/sysweb3-network';

import { Layout, Icon, Tooltip, NeutralButton } from 'components/index';
import { RootState } from 'state/store';
import { getController } from 'utils/browser';

const ConnectHardwareWalletView: FC = () => {
  const [selected, setSelected] = useState<boolean>(false);
  const [isTestnet, setIsTestnet] = useState<boolean>(false);
  const { activeNetwork, isBitcoinBased, accounts } = useSelector(
    (state: RootState) => state.vault
  );

  const trezorAccounts = Object.values(accounts.Trezor);

  const { slip44 } = activeNetwork;

  const controller = getController();

  const handleCreateHardwareWallet = async () => {
    await controller.wallet.importTrezorAccount(
      isBitcoinBased ? activeNetwork.currency : 'eth',
      `${activeNetwork.currency === 'sys' ? '57' : slip44}`,
      `${trezorAccounts.length}`
    );
  };

  const verifyIfIsTestnet = async () => {
    const { url } = activeNetwork;

    const { chain }: any = isBitcoinBased
      ? await validateSysRpc(url)
      : await validateEthRpc(url);

    return Boolean(chain === 'test' || chain === 'testnet');
  };

  useEffect(() => {
    verifyIfIsTestnet().then((isTestnetResponse) =>
      setIsTestnet(isTestnetResponse)
    );
  }, [activeNetwork, activeNetwork.chainId]);

  return (
    <Layout title="HARDWARE WALLET" id="hardware-wallet-title">
      <div className="flex flex-col items-center justify-center w-full md:max-w-md">
        <div className="scrollbar-styled px-2 h-80 text-sm overflow-y-auto md:h-3/4">
          <p className="text-white text-sm">
            Select the hardware wallet you'd like{' '}
            {!trezorAccounts.length ? 'to connect' : 'to add account'} to Pali
          </p>

          <p
            className={`${
              selected
                ? 'bg-bkg-3 border-brand-deepPink'
                : 'bg-bkg-1 border-brand-royalblue'
            } rounded-full py-2 w-80 md:w-full mx-auto text-center border text-sm my-6 cursor-pointer`}
            onClick={() => setSelected(!selected)}
            id="trezor-btn"
          >
            Trezor
          </p>

          <div className="mb-6 mx-auto p-4 w-80 text-brand-white text-xs bg-bkg-4 border border-dashed border-brand-royalblue rounded-lg md:w-full">
            <p>
              <b>Don't have a hardware wallet?</b>
              <br />
              <br />
              Order a Trezor wallet and keep your funds in cold storage.
            </p>

            <p
              className="mt-2 w-16 hover:text-brand-white text-button-primary cursor-pointer"
              onClick={() => window.open('https://trezor.io/')}
            >
              Buy now
            </p>
          </div>

          <Disclosure>
            {({ open }) => (
              <>
                <Disclosure.Button
                  className={`${
                    open ? 'rounded-t-lg' : 'rounded-lg'
                  } mt-3 w-80 md:w-full py-2 px-4 flex justify-between items-center mx-auto border border-bkg-1 cursor-pointer transition-all duration-300 bg-bkg-1 learn-more-btn`}
                >
                  Learn more
                  <Icon
                    name="select-down"
                    className={`${
                      open ? 'transform rotate-180' : ''
                    } mb-1 text-brand-deepPink100`}
                  />
                </Disclosure.Button>

                <Disclosure.Panel>
                  <div className="flex flex-col items-start justify-start mx-auto px-4 py-2 w-80 bg-bkg-3 border border-bkg-3 rounded-b-lg cursor-pointer transition-all duration-300 md:w-full md:max-w-md">
                    <p className="my-2 text-sm">
                      1 - Connect a hardware wallet
                    </p>

                    <span className="mb-4 text-xs">
                      Connect your hardware wallet directly to your computer.
                    </span>

                    <p className="my-2 text-sm">
                      2 - Start using SYS powered sites and more
                    </p>

                    <span className="mb-1 text-xs">
                      Use your hardware account like you would with any SYS
                      account. Connect to SYS web3 sites, send SYS, buy and
                      store SPT tokens.
                    </span>
                  </div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        </div>

        <div className="absolute bottom-12 md:static md:mt-6">
          <NeutralButton
            type="button"
            onClick={handleCreateHardwareWallet}
            disabled={isTestnet || !selected}
            id="connect-btn"
          >
            <Tooltip
              content={
                isTestnet &&
                "Trezor doesn't support SYS testnet. Please, change your network to be able to connect to trezor."
              }
            >
              <p>{!trezorAccounts.length ? 'Connect' : 'Add Account'}</p>
            </Tooltip>
          </NeutralButton>
        </div>
      </div>
    </Layout>
  );
};

export default ConnectHardwareWalletView;
