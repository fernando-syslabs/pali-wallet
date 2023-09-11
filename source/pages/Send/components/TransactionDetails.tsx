import { Input } from 'antd';
import isNaN from 'lodash/isNaN';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { Icon } from 'components/Icon';
import { IconButton } from 'components/IconButton';
import { Tooltip } from 'components/Tooltip';
import { useUtils } from 'hooks/useUtils';
import { RootState } from 'state/store';
import { IDecodedTx, IFeeState, ITxState } from 'types/transactions';
import { ellipsis } from 'utils/format';
import removeScientificNotation from 'utils/removeScientificNotation';

interface ITransactionDetailsProps {
  customFee: {
    gasLimit: number;
    isCustom: boolean;
    maxFeePerGas: number;
    maxPriorityFeePerGas: number;
  };
  decodedTx: IDecodedTx;
  fee: IFeeState;
  setCustomFee: React.Dispatch<
    React.SetStateAction<{
      gasLimit: number;
      isCustom: boolean;
      maxFeePerGas: number;
      maxPriorityFeePerGas: number;
    }>
  >;
  setCustomNonce: React.Dispatch<React.SetStateAction<number>>;
  setFee: React.Dispatch<React.SetStateAction<IFeeState>>;
  setHaveError: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tx: ITxState;
}

export const TransactionDetailsComponent = (
  props: ITransactionDetailsProps
) => {
  const { tx, setCustomNonce, fee, customFee, setIsOpen } = props;
  const { alert, useCopyClipboard } = useUtils();
  const [copied, copy] = useCopyClipboard();
  const [currentTxValue, setCurrentTxValue] = useState<number>(0);
  const { t } = useTranslation();

  const activeNetwork = useSelector(
    (state: RootState) => state.vault.activeNetwork
  );

  useEffect(() => {
    if (!copied) return;
    alert.removeAll();
    alert.success('Address successfully copied');
  }, [copied]);

  const finalFee =
    +removeScientificNotation(
      customFee.isCustom ? customFee.maxFeePerGas : fee.maxFeePerGas
    ) /
    10 ** 9;

  const formattedFinalFee = removeScientificNotation(finalFee);

  useEffect(() => {
    if (tx && tx.value && !isNaN(Number(tx.value))) {
      setCurrentTxValue(tx.value);
    }
  }, [tx]);

  return (
    <>
      <div className="flex flex-col gap-3 items-start justify-center w-full text-left text-sm divide-bkg-3 divide-dashed divide-y">
        <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
          {t('send.from')}
          <span className="text-brand-royalblue text-xs">
            <Tooltip content={tx.from} childrenClassName="flex">
              {ellipsis(tx.from, 7, 15)}
              {
                <IconButton onClick={() => copy(tx.from ?? '')}>
                  <Icon
                    wrapperClassname="flex items-center justify-center"
                    name="copy"
                    className="px-1 text-brand-white hover:text-fields-input-borderfocus"
                  />
                </IconButton>
              }
            </Tooltip>
          </span>
        </p>

        <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
          {t('send.to')}
          <span className="text-brand-royalblue text-xs">
            <Tooltip content={tx.to} childrenClassName="flex">
              {ellipsis(tx.to, 7, 15)}
              {
                <IconButton onClick={() => copy(tx.to ?? '')}>
                  <Icon
                    wrapperClassname="flex items-center justify-center"
                    name="copy"
                    className="px-1 text-brand-white hover:text-fields-input-borderfocus"
                  />
                </IconButton>
              }
            </Tooltip>
          </span>
        </p>

        <div className="flex flex-row items-center justify-between w-full">
          <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
            {t('send.estimatedGasFee')}
            <span className="text-brand-royalblue text-xs">
              {formattedFinalFee} {activeNetwork.currency?.toUpperCase()}
            </span>
          </p>
          <span
            className="w-fit relative bottom-1 hover:text-brand-deepPink100 text-brand-royalblue text-xs cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            {t('buttons.edit')}
          </span>
        </div>

        <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
          {t('send.customNonce')}
          <span className="text-brand-royalblue text-xs">
            <Input
              type="number"
              className="input-medium outline-0 w-10 bg-bkg-2 rounded-sm focus:outline-none focus-visible:outline-none"
              placeholder={String(tx.nonce)}
              defaultValue={tx.nonce}
              onChange={(e) => setCustomNonce(Number(e.target.value))}
            />
          </span>
        </p>

        <p className="flex flex-col pt-2 w-full text-brand-white font-poppins font-thin">
          Total ({t('send.amountAndFee')})
          <span className="text-brand-royalblue text-xs">
            {removeScientificNotation(
              Number(currentTxValue) / 10 ** 18 + finalFee
            )}{' '}
            {activeNetwork.currency?.toUpperCase()}
          </span>
        </p>
      </div>
    </>
  );
};
