import { ethErrors } from 'helpers/errors';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { SecondButton } from 'components/Button/Button';
import { ChainIcon } from 'components/ChainIcon';
import { Icon } from 'components/Icon';
import { PrimaryButton, LoadingComponent } from 'components/index';
import { useQueryData, useUtils } from 'hooks/index';
import { useController } from 'hooks/useController';
import { RootState } from 'state/store';
import { dispatchBackgroundEvent } from 'utils/browser';
import cleanErrorStack from 'utils/cleanErrorStack';

const SwitchChain: React.FC = () => {
  const { host, ...data } = useQueryData();
  const { chainId } = data;
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const activeNetwork = useSelector(
    (state: RootState) => state.vault.activeNetwork
  );
  const networks = useSelector((state: RootState) => state.vault.networks);
  const network = networks.ethereum[chainId];
  const { controllerEmitter } = useController();
  const { t } = useTranslation();
  const { navigate } = useUtils();
  const onSubmit = async () => {
    setLoading(true);
    try {
      await controllerEmitter(['wallet', 'setActiveNetwork'], [network]);
      navigate('/home');
    } catch (networkError) {
      throw cleanErrorStack(ethErrors.rpc.internal());
    }
    setConfirmed(true);
    setLoading(false);
    const type = data.eventName;
    dispatchBackgroundEvent(`${type}.${host}`, null);
    window.close();
  };

  const CurrentChains = () => {
    const fromChain = (
      <ChainIcon
        chainId={activeNetwork.chainId}
        size={100}
        className=""
        fallbackClassName="rounded-full flex items-center justify-center text-white text-sm bg-brand-blue200 p-5"
      />
    );

    const toChain = (
      <ChainIcon
        chainId={network.chainId}
        size={100}
        className=""
        fallbackClassName="rounded-full flex items-center justify-center text-brand-blue200 bg-white text-sm"
      />
    );

    return (
      <div className="w-4/5 gap-4 flex items-center align-center flex-row">
        {fromChain} <Icon name="arrowright" size={50} /> {toChain}
      </div>
    );
  };
  return (
    <>
      {!loading && (
        <div className="flex flex-col items-center justify-center w-full">
          <div className="relative top-15 flex flex-col pb-4 pt-4 w-full gap-4">
            <h2 className="text-center text-base">
              {t('send.allow')} {host} {t('settings.toSwitchNetwork')}?
            </h2>
            <div className="mt-1 px-4 w-full text-center text-sm">
              <span className="disabled">{t('settings.thisWillSwitch')}</span>
            </div>
            <div className="flex flex-col pb-4 pt-4 w-full text-center items-center">
              <CurrentChains />
            </div>
          </div>

          <div className="absolute bottom-14 flex items-center justify-between px-10 w-full md:max-w-2xl">
            <SecondButton type="button" onClick={window.close} action={true}>
              {t('buttons.reject')}
            </SecondButton>

            <PrimaryButton
              type="submit"
              disabled={confirmed}
              loading={loading}
              onClick={onSubmit}
              action={true}
            >
              {t('buttons.confirm')}
            </PrimaryButton>
          </div>
        </div>
      )}
      {loading && (
        <div className="relative top-40 flex items-center justify-center w-full">
          <LoadingComponent />
        </div>
      )}
    </>
  );
};

export default SwitchChain;
