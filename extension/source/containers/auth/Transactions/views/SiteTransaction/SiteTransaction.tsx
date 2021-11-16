import React, { useState, FC } from 'react';
<<<<<<< HEAD:extension/source/containers/auth/SiteTransaction/SiteTransaction.tsx
import Layout from 'containers/common/Layout';
import { Button } from 'components/index';
import { useHistory } from 'react-router-dom';
import {
  useController,
  // useUtils
} from 'hooks/index';
import { browser } from 'webextension-polyfill-ts';
=======
import { AuthViewLayout } from 'containers/common/Layout';
import { Button } from 'components/index';;
import { useHistory } from 'react-router-dom';
import { useController/*, useUtils*/, useBrowser } from 'hooks/index';
>>>>>>> origin/styles:extension/source/containers/auth/Transactions/views/SiteTransaction/SiteTransaction.tsx

interface ISiteTransaction {
  callbackToSetDataFromWallet: any;
  confirmRoute: string;
  itemStringToClearData: string;
  layoutTitle: string;
  messageToSetDataFromWallet: string;
}

export const SiteTransaction: FC<ISiteTransaction> = ({
  callbackToSetDataFromWallet,
  messageToSetDataFromWallet,
  confirmRoute,
  itemStringToClearData,
  layoutTitle,
}) => {
  const controller = useController();
  const history = useHistory();
  // const { alert } = useUtils();
<<<<<<< HEAD:extension/source/containers/auth/SiteTransaction/SiteTransaction.tsx
=======
  const { browser } = useBrowser();
>>>>>>> origin/styles:extension/source/containers/auth/Transactions/views/SiteTransaction/SiteTransaction.tsx

  // const [loading, setLoading] = useState<boolean>(false);
  const [fee, setFee] = useState('0');
  const [recommend, setRecommend] = useState(0.00001);
  // const [transacting, setTransacting] = useState(false);

  const handleGetFee = async () => {
    const recommendFee = await controller.wallet.account.getRecommendFee();

    setRecommend(recommendFee);
    setFee(String(recommendFee));
  };

  const handleMessageToSetDataFromWallet = () => {
    callbackToSetDataFromWallet({
      fee,
    });

    browser.runtime.sendMessage({
      type: messageToSetDataFromWallet,
      target: 'background',
    });

    // setTransacting(true);
    // setLoading(true);

    history.push(confirmRoute);
  };

  // const handleFeeChange = useCallback(
  //   (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  //     setFee(event.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'));

  //     if (Number(event.target.value) > 0.1) {
  //       alert.removeAll();
  //       alert.error(`Error: Fee too high, maximum 0.1 SYS.`, { timeout: 2000 });

  //       return;
  //     }
  //   },
  //   []
  // );

  const handleRejectTransaction = () => {
    history.push('/home');

    browser.runtime.sendMessage({
      type: 'WALLET_ERROR',
      target: 'background',
      transactionError: true,
      invalidParams: false,
      message: 'Transaction rejected.',
    });

    browser.runtime.sendMessage({
      type: 'CANCEL_TRANSACTION',
      target: 'background',
      item: itemStringToClearData || null,
    });

    browser.runtime.sendMessage({
      type: 'CLOSE_POPUP',
      target: 'background',
    });
  };

  return (
    <div>
<<<<<<< HEAD:extension/source/containers/auth/SiteTransaction/SiteTransaction.tsx
      <Layout title={layoutTitle}>
        <form>
=======
      <AuthViewLayout title={layoutTitle}>
        <form >
>>>>>>> origin/styles:extension/source/containers/auth/Transactions/views/SiteTransaction/SiteTransaction.tsx
          <label htmlFor="fee">Fee</label>

          <section>
            <input type="text" />

            <Button type="button" onClick={handleGetFee}>
              Recommend
            </Button>
          </section>

          <p>
            With current network conditions, we recommend a fee of {recommend}{' '}
            SYS.
          </p>

          <section>
            <div>
              <Button type="button" onClick={handleRejectTransaction}>
                Reject
              </Button>

              <Button type="button" onClick={handleMessageToSetDataFromWallet}>
                Next
              </Button>
            </div>
          </section>
        </form>
      </AuthViewLayout>
    </div>
  );
};
