import React, { FC, useEffect, useState, ChangeEvent } from 'react';
import { Modal, Select } from 'components/index';
import { Settings } from 'containers/auth/index';
import { SYS_NETWORK } from 'constants/index';
import { browser } from 'webextension-polyfill-ts';
import { useController, useStore, useUtils } from 'hooks/index';
import { SettingOutlined } from '@ant-design/icons';

interface INormalHeader {
  importSeed: boolean;
  generalSettingsShowed: boolean;
  handleCloseSettings: any;
  showSettings: any;
  isUnlocked: boolean;
  encriptedMnemonic: string;
}

const NormalHeader: FC<INormalHeader> = ({
  importSeed,
  generalSettingsShowed,
  handleCloseSettings,
  showSettings,
  isUnlocked,
  encriptedMnemonic
}) => {
  const {
    accounts,
    activeAccountId,
    currentURL,
    activeNetwork
  } = useStore();

  const { getHost } = useUtils();

  const network = activeNetwork;

  const [currentTabURL, setCurrentTabURL] = useState<string>(currentURL);
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const controller = useController();

  const handleSetModalIsOpen = () => {
    setIsOpenModal(!isOpenModal);
  };

  const handleChangeNetwork = (
    event: ChangeEvent<{
      name?: string | undefined;
      value: unknown;
    }>
  ) => {
    controller.wallet.switchNetwork(event.target.value as string);
    controller.wallet.getNewAddress();
  };

  useEffect(() => {
    browser.windows.getAll({ populate: true }).then((windows) => {
      for (const window of windows) {
        const views = browser.extension.getViews({ windowId: window.id });

        if (views) {
          browser.tabs
            .query({ active: true, currentWindow: true })
            .then((tabs) => {
              setCurrentTabURL(String(tabs[0].url));
            });

          return;
        }
      }
    });
  }, [!controller.wallet.isLocked()]);

  useEffect(() => {
    const acc = accounts.find((element) => element.id === activeAccountId);

    if (acc && acc.connectedTo !== undefined) {
      if (acc.connectedTo.length > 0) {
        setIsConnected(
          acc.connectedTo.findIndex((url: any) => {
            return url == getHost(currentTabURL);
          }) > -1
        );
        return;
      }

      setIsConnected(false);
    }
  }, [accounts, activeAccountId, currentTabURL]);

  return (
    <div className="flex items-center bg-brand-navydarker text-gray-300 p-2">
      <Select
        value={network || SYS_NETWORK.main.id}
        className="bg-brand-navydarker text-gray-300 "
        onChange={handleChangeNetwork}
        options={[
          { [SYS_NETWORK.main.id]: SYS_NETWORK.main.label },
          { [SYS_NETWORK.testnet.id]: SYS_NETWORK.testnet.label },
        ]}
      />

      {isConnected ? (
        <small
          onClick={() => setIsOpenModal(!isOpenModal)}
        >
          Connected
        </small>
      ) : (
        <small
          onClick={() => setIsOpenModal(!isOpenModal)}
        >
          Not connected
        </small>
      )}

      {isOpenModal && (
        <div
          onClick={() => setIsOpenModal(false)}
        />
      )}

      {isOpenModal && isConnected && (
        <Modal
          title={currentTabURL}
          connected
          callback={handleSetModalIsOpen}
        />
      )}

      {isOpenModal && !isConnected && (
        <Modal
          title={currentTabURL}
          message="This account is not connected to this site. To connect to a sys platform site, find the connect button on their site."
          callback={handleSetModalIsOpen}
        />
      )}

      {encriptedMnemonic && !importSeed ? (

        <button className="pl-20" onClick={() => {
          console.log('generalSettingsShowed', generalSettingsShowed)
          generalSettingsShowed ? handleCloseSettings() : showSettings(!generalSettingsShowed)}}
          >
            <SettingOutlined />
        </button>
      ) : (
        null
      )}

      <Settings
        accountSettings={false}
        generalSettings
        open={generalSettingsShowed && isUnlocked}
        onClose={handleCloseSettings}
      />
    </div>
  )
}

export default NormalHeader;
