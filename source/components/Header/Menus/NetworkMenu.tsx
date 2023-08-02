import { Disclosure, Menu, Transition } from '@headlessui/react';
import { uniqueId } from 'lodash';
import React from 'react';
import { useSelector } from 'react-redux';

import { KeyringAccountType } from '@pollum-io/sysweb3-keyring';
import { INetwork } from '@pollum-io/sysweb3-network';

import arrow from 'assets/images/arrow.png';
import { Icon } from 'components/index';
import { useUtils } from 'hooks/index';
import { RootState } from 'state/store';
import { getController } from 'utils/browser';
import { NetworkType } from 'utils/types';

interface INetworkComponent {
  setActiveAccountModalIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedNetwork: React.Dispatch<
    React.SetStateAction<{ chain: string; network: INetwork }>
  >;
}

export const NetworkMenu: React.FC<INetworkComponent> = (
  props: INetworkComponent
) => {
  const { setActiveAccountModalIsOpen, setSelectedNetwork } = props;
  const { wallet } = getController();

  const networks = useSelector((state: RootState) => state.vault.networks);
  const isBitcoinBased = useSelector(
    (state: RootState) => state.vault.isBitcoinBased
  );
  const {
    activeAccount: { type: activeAccountType },
  } = useSelector((state: RootState) => state.vault);

  const activeNetwork = useSelector(
    (state: RootState) => state.vault.activeNetwork
  );

  const activeAccount = useSelector(
    (state: RootState) =>
      state.vault.accounts[state.vault.activeAccount.type][
        state.vault.activeAccount.id
      ]
  );

  const networkType = isBitcoinBased ? NetworkType.UTXO : NetworkType.EVM;

  const bgColor =
    networkType === NetworkType.UTXO ? 'bg-brand-pink' : 'bg-brand-blue';

  const activeNetworkValidator = (currentNetwork: INetwork): boolean =>
    Boolean(
      activeNetwork.chainId === currentNetwork.chainId &&
        activeNetwork.url === currentNetwork.url &&
        activeNetwork.label === currentNetwork.label
    );

  const { navigate } = useUtils();

  const handleChangeNetwork = async (network: INetwork, chain: string) => {
    setSelectedNetwork({ network, chain });
    const cannotContinueWithTrezorAccount =
      // verify if user are on bitcoinBased network and if current account is Trezor-based
      (isBitcoinBased && activeAccountType === KeyringAccountType.Trezor) ||
      // or if user are in EVM network, using a trezor account, trying to change to UTXO network.
      (Object.keys(networks.ethereum).find(
        (chainId) => `${activeNetwork.chainId}` === chainId
      ) &&
        Object.keys(networks.syscoin).find(
          (chainId) => `${network.chainId}` === chainId
        ) &&
        `${network.slip44}` !== 'undefined' &&
        activeAccountType === KeyringAccountType.Trezor);

    try {
      if (cannotContinueWithTrezorAccount) {
        setActiveAccountModalIsOpen(true);
        return;
      }
      await wallet.setActiveNetwork(network, chain);
    } catch (networkError) {
      navigate('/home');
    }
  };
  return (
    <Menu as="div" className="absolute left-2 inline-block mr-8 text-left">
      {(menuprops) => (
        <>
          <Menu.Button className="inline-flex gap-x-2 items-center justify-start ml-2 w-full text-white text-sm font-medium hover:bg-opacity-30 rounded-full focus:outline-none cursor-pointer">
            <span>{activeNetwork.label}</span>
            <span className={`px-2 py-0.4 text-white rounded-full ${bgColor}`}>
              {networkType}
            </span>

            <img
              src={arrow}
              className={`relative right-2 flex items-center ${
                menuprops.open ? 'transform rotate-180' : ''
              } text-brand-white`}
              id="network-settings-btn"
            />
          </Menu.Button>

          <Transition
            as="div"
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <div className="fixed z-50 -inset-0 w-full bg-brand-black bg-opacity-50 transition-all duration-300 ease-in-out" />

            <Menu.Items
              as="div"
              className="absolute z-50 left-0 pb-6 w-72 h-menu text-center text-brand-white font-poppins bg-menu-primary rounded-2xl focus:outline-none shadow-2xl overflow-hidden origin-top-right ring-1 ring-black ring-opacity-5"
            >
              <h2
                className="mb-6 pb-6 pt-8 w-full text-center text-brand-white bg-menu-primary border-b border-dashed border-dashed-light"
                id="network-settings-title"
              >
                NETWORK SETTINGS
              </h2>
              <div className="scrollbar-styled h-80 overflow-auto">
                <Menu.Item>
                  <li
                    onClick={() =>
                      navigate('/settings/networks/connected-sites')
                    }
                    className="flex items-center justify-start mb-2 mx-3 px-2 py-1 text-base bg-warning-success hover:bg-opacity-70 border border-solid border-transparent hover:border-warning-success rounded-full cursor-pointer transition-all duration-200"
                  >
                    <Icon
                      name="globe"
                      className="mb-1 ml-1 mr-4 text-brand-white"
                    />

                    <span className="px-3">Connected sites</span>
                  </li>
                </Menu.Item>

                <Menu.Item>
                  <li
                    onClick={() => navigate('/settings/networks/trusted-sites')}
                    className="flex items-center justify-start mb-4 mx-3 px-2 py-1 text-base bg-brand-royalblue hover:bg-opacity-70 border border-solid border-brand-royalblue rounded-full cursor-pointer transition-all duration-200"
                  >
                    <Icon
                      name="warning"
                      className="mb-1 ml-1 mr-4 text-brand-white"
                    />

                    <span className="px-3">Trusted sites</span>
                  </li>
                </Menu.Item>

                {!activeAccount.isImported ? (
                  <Menu.Item>
                    <Disclosure>
                      {({ open }) => (
                        <>
                          <Disclosure.Button className="flex items-center justify-start px-5 py-3 w-full text-base hover:bg-bkg-3 cursor-pointer transition-all duration-200">
                            <Icon
                              name="dolar"
                              className="ml-1 mr-4 text-brand-white"
                            />

                            <span className="px-3 text-base">
                              UTXO Networks
                            </span>

                            <img
                              src={arrow}
                              className={`relative right-2 flex items-center ${
                                open ? 'transform rotate-180' : ''
                              } text-brand-white`}
                              id="network-settings-btn"
                            />
                          </Disclosure.Button>

                          <Disclosure.Panel className="h-max pb-2 pt-0.5 text-sm bg-menu-secondary">
                            {Object.values(networks.syscoin).map(
                              (currentNetwork: INetwork) => (
                                <li
                                  key={uniqueId()}
                                  className="backface-visibility-hidden flex flex-col justify-around mt-2 mx-auto p-2.5 max-w-95 text-white text-sm font-medium bg-menu-secondary active:bg-opacity-40 focus:outline-none cursor-pointer transform hover:scale-105 transition duration-300"
                                  onClick={() =>
                                    handleChangeNetwork(
                                      currentNetwork,
                                      'syscoin'
                                    )
                                  }
                                >
                                  <span className="ml-8 text-left">
                                    {currentNetwork.label}
                                  </span>

                                  {isBitcoinBased &&
                                    activeNetworkValidator(currentNetwork) && (
                                      <Icon
                                        name="check"
                                        className="mb-1 w-4"
                                        wrapperClassname="w-6 absolute right-20"
                                      />
                                    )}
                                </li>
                              )
                            )}
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  </Menu.Item>
                ) : null}

                <Menu.Item>
                  <Disclosure>
                    {({ open }) => (
                      <>
                        <Disclosure.Button className="flex items-center justify-start px-5 py-3 w-full text-base hover:bg-bkg-3 cursor-pointer transition-all duration-200">
                          <Icon
                            name="dolar"
                            className="ml-1 mr-4 text-brand-white"
                          />

                          <span className="px-3 text-base">Web3 Networks</span>

                          <img
                            src={arrow}
                            className={`relative right-2 flex items-center ${
                              open ? 'transform rotate-180' : ''
                            } text-brand-white`}
                            id="network-settings-btn"
                          />
                        </Disclosure.Button>

                        <Disclosure.Panel className="h-max pb-2 pt-0.5 text-sm bg-menu-secondary">
                          {Object.values(networks.ethereum)
                            .sort((a, b) =>
                              a.chainId === 57 ? -1 : b.chainId === 57 ? 1 : 0
                            )

                            .map((currentNetwork: any) => (
                              <li
                                key={uniqueId()}
                                className="backface-visibility-hidden flex flex-row items-center justify-start mt-2 mx-auto p-2.5 max-w-95 text-white text-sm font-medium bg-menu-secondary active:bg-opacity-40 focus:outline-none cursor-pointer transform hover:scale-105 transition duration-300"
                                onClick={() =>
                                  handleChangeNetwork(
                                    currentNetwork,
                                    'ethereum'
                                  )
                                }
                              >
                                <span className="ml-8 text-left">
                                  {currentNetwork.label}
                                </span>

                                {!isBitcoinBased &&
                                  activeNetworkValidator(currentNetwork) && (
                                    <Icon
                                      name="check"
                                      className="right-0 mb-1 w-4"
                                      wrapperClassname="w-6 right-16"
                                    />
                                  )}
                              </li>
                            ))}
                        </Disclosure.Panel>
                      </>
                    )}
                  </Disclosure>
                </Menu.Item>

                <Menu.Item>
                  <li
                    onClick={() => navigate('/settings/networks/custom-rpc')}
                    className="flex items-center justify-start px-5 py-3 w-full text-base hover:bg-bkg-3 cursor-pointer transition-all duration-200"
                  >
                    <Icon
                      name="appstoreadd"
                      className="ml-1 mr-4 text-brand-white"
                    />

                    <span className="px-3">Custom RPC</span>
                  </li>
                </Menu.Item>

                <Menu.Item>
                  <li
                    onClick={() => navigate('/settings/networks/edit')}
                    className="flex items-center justify-start px-5 py-3 w-full text-base hover:bg-bkg-3 cursor-pointer transition-all duration-200"
                  >
                    <Icon name="edit" className="ml-1 mr-4 text-brand-white" />

                    <span className="px-3">Manage networks</span>
                  </li>
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};
