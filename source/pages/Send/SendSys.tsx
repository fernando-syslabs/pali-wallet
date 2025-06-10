import { Switch, Menu, Transition } from '@headlessui/react';
import { Form, Input } from 'antd';
import currency from 'currency.js';
import { toSvg } from 'jdenticon';
import { uniqueId } from 'lodash';
import * as React from 'react';
import { useState, useEffect, Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

//todo: update with the new function
import { ISyscoinTransactionError } from '@pollum-io/sysweb3-keyring';
import { isValidSYSAddress } from '@pollum-io/sysweb3-utils';

import { Tooltip, Fee, NeutralButton, Layout, Icon } from 'components/index';
import { useUtils } from 'hooks/index';
import { useController } from 'hooks/useController';
import { RootState } from 'state/store';
import { ITokenSysProps } from 'types/tokens';
import {
  truncate,
  isNFT,
  getAssetBalance,
  formatCurrency,
  ellipsis,
  MINIMUM_FEE,
  FIELD_VALUES_INITIAL_STATE,
  FieldValuesType,
} from 'utils/index';

export const SendSys = () => {
  const { controllerEmitter } = useController();
  const { t } = useTranslation();
  const { alert, navigate } = useUtils();
  const activeNetwork = useSelector(
    (state: RootState) => state.vault.activeNetwork
  );
  const { accounts, activeAccount: activeAccountMeta } = useSelector(
    (state: RootState) => state.vault
  );
  const activeAccount = accounts[activeAccountMeta.type][activeAccountMeta.id];

  const [RBF, setRBF] = useState<boolean>(true);
  const [selectedAsset, setSelectedAsset] = useState<ITokenSysProps | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [fieldsValues, setFieldsValues] = useState<FieldValuesType>(
    FIELD_VALUES_INITIAL_STATE
  );
  const [isMaxSend, setIsMaxSend] = useState(false);

  const [form] = Form.useForm();

  // Fee rate will be managed by the Fee component
  const [feeRate, setFeeRate] = useState<number | null>(null);

  // Watch for fee changes from the Fee component
  useEffect(() => {
    const interval = setInterval(() => {
      const currentFormFee = form.getFieldValue('fee');
      if (currentFormFee && Number(currentFormFee) !== Number(feeRate)) {
        setFeeRate(Number(currentFormFee));
      }
    }, 500); // Check every 500ms for form changes

    return () => clearInterval(interval);
  }, [form, feeRate]);

  // Set a default fee rate on mount
  useEffect(() => {
    const fetchInitialFee = async () => {
      try {
        const fee = (await controllerEmitter(
          ['wallet', 'getRecommendedFee'],
          []
        )) as number;
        setFeeRate(fee);
        form.setFieldsValue({ fee });
      } catch (error) {
        console.error('Failed to fetch initial fee:', error);
        const fallbackFee = 0.0000001;
        setFeeRate(fallbackFee);
        form.setFieldsValue({ fee: fallbackFee });
      }
    };
    fetchInitialFee();
  }, [activeNetwork.chainId, form]);

  const isAccountImported =
    accounts[activeAccountMeta.type][activeAccountMeta.id]?.isImported;

  const assets = activeAccount.assets.syscoin
    ? Object.values(activeAccount.assets.syscoin)
    : [];

  const assetDecimals =
    selectedAsset && selectedAsset?.decimals ? selectedAsset.decimals : 8;

  const formattedAssetBalance =
    selectedAsset &&
    truncate(
      formatCurrency(
        String(+selectedAsset.balance / 10 ** assetDecimals),
        selectedAsset.decimals
      ),
      14
    );

  // Keep balance as string to preserve precision
  const balanceStr = selectedAsset
    ? formattedAssetBalance || '0'
    : activeAccount?.balances.syscoin || '0';

  const handleMaxButton = useCallback(() => {
    // Simply fill in the full balance
    form.setFieldValue('amount', balanceStr);
    setFieldsValues({
      ...fieldsValues,
      amount: String(balanceStr),
    });
    setIsMaxSend(true); // Set the flag when max is clicked
  }, [balanceStr, fieldsValues, form]);

  const handleInputChange = useCallback(
    (type: 'receiver' | 'amount', e: any) => {
      setFieldsValues({
        ...fieldsValues,
        [type]: e.target.value,
      });

      // Clear isMaxSend flag if amount is manually changed
      if (type === 'amount' && e.target.value !== balanceStr) {
        setIsMaxSend(false);
      }
    },
    [fieldsValues, balanceStr]
  );

  const handleSelectedAsset = (item: number) => {
    if (assets) {
      const getAsset = assets.find((asset: any) => asset.assetGuid === item);

      if (getAsset) {
        setSelectedAsset(getAsset);
        // Clear cached fee when switching assets
        setIsMaxSend(false);
        return;
      }

      setSelectedAsset(null);
      // Clear cached fee when switching to native
      setIsMaxSend(false);
    }
  };

  const RBFOnChange = (value: any) => {
    // For SPTs, the switch shows ZDAG, so we need to invert the value
    // When ZDAG is enabled (value=true), RBF should be disabled (false)
    const rbfValue = selectedAsset ? !value : value;
    setRBF(rbfValue);

    form.setFieldsValue({ RBF: rbfValue });
  };

  const nextStep = async ({ receiver, amount }: any) => {
    try {
      setIsLoading(true);

      // For native SYS, validate that amount + fee doesn't exceed balance
      if (!selectedAsset && !isMaxSend) {
        const amountCurrency = currency(amount, { precision: 8 });
        const balanceCurrency = currency(activeAccount.balances.syscoin, {
          precision: 8,
        });

        // For validation, we need to estimate the total fee to ensure sufficient funds
        let estimatedTotalFee = 0.001; // Conservative default
        let psbt = null;
        try {
          const { fee: estimatedFee, psbt: estimatedPsbt } =
            (await controllerEmitter(
              ['wallet', 'syscoinTransaction', 'getEstimateSysTransactionFee'],
              [
                {
                  amount: Number(amount),
                  receivingAddress: receiver,
                  feeRate,
                  txOptions: { rbf: RBF },
                  isMax: isMaxSend,
                  token: null, // Explicitly pass null for native transactions
                },
              ]
            )) as { fee: number; psbt: any };

          estimatedTotalFee = estimatedFee;
          psbt = estimatedPsbt;

          // Critical validation: If PSBT creation failed, we cannot proceed
          if (!psbt || !estimatedPsbt) {
            throw new Error('Failed to create transaction PSBT');
          }
        } catch (error: any) {
          setIsLoading(false);
          alert.removeAll();

          // Handle structured errors from syscoinjs-lib
          if (error.error && error.code) {
            const sysError = error as ISyscoinTransactionError;

            switch (sysError.code) {
              case 'INSUFFICIENT_FUNDS':
                alert.error(
                  t('send.insufficientFundsDetails', {
                    shortfall: sysError.shortfall?.toFixed(8) || '0',
                    currency: activeNetwork.currency.toUpperCase(),
                  })
                );
                break;

              case 'SUBTRACT_FEE_FAILED':
                alert.error(
                  t('send.subtractFeeFailedDetails', {
                    fee: sysError.fee?.toFixed(8) || '0',
                    remainingFee: sysError.remainingFee?.toFixed(8) || '0',
                    currency: activeNetwork.currency.toUpperCase(),
                  })
                );
                break;

              case 'INVALID_FEE_RATE':
                alert.error(t('send.invalidFeeRate'));
                break;

              case 'INVALID_AMOUNT':
                alert.error(t('send.invalidAmount'));
                break;

              default:
                alert.error(
                  t('send.transactionCreationFailedWithCode', {
                    code: sysError.code,
                    message: sysError.message,
                  })
                );
            }
          } else {
            // Fallback for non-structured errors
            alert.error(
              t('send.transactionCreationFailed', { error: error.message }) ||
                `Failed to create transaction: ${error.message}. Please try again.`
            );
          }
          return;
        }

        const totalNeeded = amountCurrency.add(estimatedTotalFee);

        if (totalNeeded.value > balanceCurrency.value) {
          setIsLoading(false);
          alert.removeAll();
          alert.error(t('send.insufficientFunds'));
          return;
        }

        setIsLoading(false);

        // The sysweb3-keyring library expects a fee rate (SYS per byte), not a total fee.

        const txData = {
          sender: activeAccount.address,
          receivingAddress: receiver,
          amount: Number(amount),
          fee: estimatedTotalFee, // Actual fee amount (compliant with SysProvider API)
          feeRate: feeRate, // Add fee rate for transaction details display
          rbf: RBF, // RBF state for transaction details display
          token: null,
          psbt: psbt,
        };

        // Final safety check - ensure amount + estimated fee doesn't exceed balance
        const finalCheck = amountCurrency.add(estimatedTotalFee);
        if (finalCheck.value > balanceCurrency.value) {
          console.error('Final safety check failed:', {
            amount: amountCurrency.value,
            estimatedFee: estimatedTotalFee,
            total: finalCheck.value,
            balance: balanceCurrency.value,
          });
          alert.removeAll();
          alert.error(t('send.insufficientFunds'));
          return;
        }

        navigate('/send/confirm', {
          state: {
            tx: txData,
          },
        });
      } else {
        // For tokens, we need to estimate the fee for display
        let tokenFeeEstimate = MINIMUM_FEE; // Default
        let tokenPsbt = null;
        try {
          const { fee: estimatedFee, psbt } = (await controllerEmitter(
            ['wallet', 'syscoinTransaction', 'getEstimateSysTransactionFee'],
            [
              {
                amount: Number(amount),
                receivingAddress: receiver,
                feeRate,
                txOptions: { rbf: RBF },
                token: {
                  symbol: selectedAsset.symbol,
                  guid: selectedAsset.assetGuid,
                },
              },
            ]
          )) as { fee: number; psbt: any };

          tokenFeeEstimate = estimatedFee;
          tokenPsbt = psbt;

          // Critical validation: If PSBT creation failed, we cannot proceed
          if (!psbt || !tokenPsbt) {
            throw new Error('Failed to create token transaction PSBT');
          }
        } catch (error: any) {
          setIsLoading(false);
          alert.removeAll();

          // Handle structured errors from syscoinjs-lib
          if (error.error && error.code) {
            const sysError = error as ISyscoinTransactionError;

            switch (sysError.code) {
              case 'INSUFFICIENT_FUNDS':
                alert.error(
                  t('send.insufficientFundsDetails', {
                    shortfall: sysError.shortfall?.toFixed(8) || '0',
                    currency: activeNetwork.currency.toUpperCase(),
                  })
                );
                break;

              case 'SUBTRACT_FEE_FAILED':
                alert.error(
                  t('send.subtractFeeFailedDetails', {
                    fee: sysError.fee?.toFixed(8) || '0',
                    remainingFee: sysError.remainingFee?.toFixed(8) || '0',
                    currency: activeNetwork.currency.toUpperCase(),
                  })
                );
                break;

              case 'INVALID_FEE_RATE':
                alert.error(t('send.invalidFeeRate'));
                break;

              case 'INVALID_AMOUNT':
                alert.error(t('send.invalidAmount'));
                break;

              case 'INVALID_ASSET_ALLOCATION':
                alert.error(
                  t('send.invalidAssetAllocation', {
                    guid: error.details?.guid || 'Unknown',
                  })
                );
                break;

              default:
                alert.error(
                  t('send.transactionCreationFailedWithCode', {
                    code: sysError.code,
                    message: sysError.message,
                  })
                );
            }
          } else {
            // Fallback for non-structured errors
            alert.error(
              t('send.transactionCreationFailed', { error: error.message }) ||
                `Failed to create token transaction: ${error.message}. Please try again.`
            );
          }
          return;
        }

        setIsLoading(false);
        navigate('/send/confirm', {
          state: {
            tx: {
              sender: activeAccount.address,
              receivingAddress: receiver,
              amount: Number(amount),
              fee: tokenFeeEstimate, // Actual fee amount (compliant with SysProvider API)
              feeRate: feeRate, // Add fee rate for transaction details display
              rbf: RBF, // RBF state for transaction details display
              psbt: tokenPsbt,
              token: {
                symbol: selectedAsset.symbol,
                guid: selectedAsset.assetGuid,
              },
            },
          },
        });
      }
    } catch (error) {
      setIsLoading(false);
      alert.removeAll();
      alert.error(t('send.internalError'));
    }
  };

  useEffect(() => {
    const placeholder = document.querySelector('.add-identicon');
    if (!placeholder) return;

    placeholder.innerHTML = toSvg(
      accounts[activeAccountMeta.type][activeAccountMeta.id]?.xpub,
      50,
      {
        backColor: '#07152B',
        padding: 1,
      }
    );
  }, [accounts[activeAccountMeta.type][activeAccountMeta.id]?.address]);

  // Remove the useEffect that was causing fluctuations
  // The MAX button already handles the calculation properly

  return (
    <Layout title={`${t('send.send')} ${activeNetwork.currency.toUpperCase()}`}>
      <div>
        <div className="flex flex-col items-center justify-center">
          <div className="add-identicon ml-1 mr-2 my-2" />
          <div className="flex gap-1 justify-center items-center">
            <img src={'/assets/images/paliLogoWhiteSmall.svg'} />
            <div className="flex text-white gap-1 text-xs font-normal w-max">
              <p>
                {accounts[activeAccountMeta.type][activeAccountMeta.id]?.label}
              </p>
              <p>
                {ellipsis(
                  accounts[activeAccountMeta.type][activeAccountMeta.id]
                    ?.address,
                  4,
                  4
                )}
              </p>
            </div>
            {isAccountImported && (
              <div className="text-brand-blue100 text-xs font-medium bg-alpha-whiteAlpha200 py-[2px] px-[6px] rounded-[100px] w-max h-full">
                Imported
              </div>
            )}
          </div>
          <div className="flex gap-1 mt-[6px]">
            <p className="text-brand-gray200 text-xs">Your balance:</p>
            <p className="text-white text-xs font-semibold">
              {selectedAsset
                ? getAssetBalance(
                    selectedAsset,
                    activeAccount,
                    true,
                    activeNetwork
                  )
                : `${activeAccount.balances.syscoin} ${activeNetwork.currency}`}
            </p>
          </div>
        </div>

        <Form
          validateMessages={{ default: '' }}
          form={form}
          id="send-form"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 8 }}
          initialValues={{
            RBF: true,
          }}
          onFinish={nextStep}
          autoComplete="off"
          className="flex flex-col gap-2 items-center justify-center mt-6 text-center md:w-full"
        >
          <Form.Item
            name="receiver"
            className="md:w-full md:max-w-md"
            hasFeedback
            rules={[
              {
                required: true,
                message: '',
              },
              () => ({
                validator(_, value) {
                  if (
                    !value ||
                    isValidSYSAddress(value, activeNetwork.chainId, true)
                  ) {
                    return Promise.resolve();
                  }

                  return Promise.reject();
                },
              }),
            ]}
          >
            <Input
              type="text"
              placeholder={t('send.receiver')}
              className="sender-custom-input"
              onChange={(e) => handleInputChange('receiver', e)}
            />
          </Form.Item>
          <div className="flex gap-2 w-full items-center">
            <div className="flex md:max-w-md">
              {
                <Form.Item
                  name="asset"
                  className=""
                  rules={[
                    {
                      required: false,
                      message: '',
                    },
                  ]}
                >
                  <Menu>
                    <div className="relative inline-block text-left">
                      <Menu.Button className="inline-flex items-center w-[100px] gap-4  justify-center border border-alpha-whiteAlpha300 px-5 py-[7px]  bg-brand-blue800 hover:bg-opacity-30 rounded-[100px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                        <p className="w-full uppercase text-white text-xs font-normal">
                          {String(
                            selectedAsset?.symbol
                              ? selectedAsset?.symbol
                              : activeNetwork.currency
                          )}
                        </p>
                        <Icon isSvg name="ArrowDown" />
                      </Menu.Button>

                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        {
                          <Menu.Items
                            as="div"
                            className="scrollbar-styled absolute z-10 left-0 mt-2 py-3 w-44 h-56 text-brand-white font-poppins bg-brand-blue800 border border-fields-input-border focus:border-fields-input-borderfocus rounded-2xl shadow-2xl overflow-auto origin-top-right"
                          >
                            <Menu.Item as="div" key={uniqueId()}>
                              <button
                                onClick={() => handleSelectedAsset(-1)}
                                className="group flex items-center justify-between p-2 w-full hover:text-brand-royalblue text-brand-white font-poppins text-sm border-0 border-transparent transition-all duration-300"
                              >
                                <p>SYS</p>
                                <small>{t('send.native')}</small>
                              </button>
                            </Menu.Item>

                            {activeAccount.assets.syscoin.length > 0
                              ? activeAccount.assets.syscoin.map(
                                  (item: any) => (
                                    <>
                                      {item?.assetGuid ? (
                                        <Menu.Item as="div" key={uniqueId()}>
                                          <Menu.Item>
                                            <button
                                              onClick={() => {
                                                if (
                                                  activeAccount.isTrezorWallet
                                                ) {
                                                  alert.removeAll();
                                                  alert.error(
                                                    'Cannot send custom token with Trezor Account.'
                                                  );
                                                  return;
                                                }
                                                handleSelectedAsset(
                                                  item.assetGuid
                                                );
                                              }}
                                              className="group flex items-center justify-between px-2 py-2 w-full hover:text-brand-royalblue text-brand-white font-poppins text-sm border-0 border-transparent transition-all duration-300"
                                            >
                                              <p>{item?.symbol}</p>

                                              <small>
                                                {isNFT(item.assetGuid)
                                                  ? 'NFT'
                                                  : 'SPT'}
                                              </small>
                                            </button>
                                          </Menu.Item>
                                        </Menu.Item>
                                      ) : null}
                                    </>
                                  )
                                )
                              : null}
                          </Menu.Items>
                        }
                      </Transition>
                    </div>
                  </Menu>
                </Form.Item>
              }
            </div>

            <div className="flex md:w-96 relative">
              <Form.Item
                name="amount"
                className="relative w-full"
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: '',
                  },
                  () => ({
                    async validator(_, value) {
                      // Work with strings to avoid precision loss
                      const inputAmount = value ? String(value).trim() : '';

                      // Check if empty or invalid
                      if (!inputAmount || inputAmount === '') {
                        return Promise.reject('');
                      }

                      // Check if it's a valid positive number
                      const numValue = parseFloat(inputAmount);
                      if (isNaN(numValue) || numValue <= 0) {
                        return Promise.reject('');
                      }

                      // Get balance as string to preserve precision
                      let validationBalanceStr: string;
                      if (selectedAsset) {
                        // For assets, the balance is already formatted
                        validationBalanceStr = formattedAssetBalance
                          ? String(formattedAssetBalance)
                          : '0';
                      } else {
                        // For native SYS, balance is already in decimal format
                        validationBalanceStr = activeAccount?.balances.syscoin
                          ? String(activeAccount.balances.syscoin)
                          : '0';
                      }

                      // Use currency.js with 8 decimal precision for safe comparison
                      try {
                        const inputCurrency = currency(inputAmount, {
                          precision: 8,
                        });
                        const balanceCurrency = currency(validationBalanceStr, {
                          precision: 8,
                        });

                        if (inputCurrency.value <= 0) {
                          return Promise.reject('');
                        }

                        // For tokens, just check against balance
                        if (selectedAsset) {
                          if (inputCurrency.value > balanceCurrency.value) {
                            return Promise.reject(t('send.insufficientFunds'));
                          }
                        } else {
                          // For native SYS, if sending max, just check balance
                          if (isMaxSend) {
                            if (inputCurrency.value > balanceCurrency.value) {
                              return Promise.reject(
                                t('send.insufficientFunds')
                              );
                            }
                          } else {
                            // Otherwise use conservative fee estimate for validation
                            const feeToUse = 0.001;
                            const totalNeeded = inputCurrency.add(feeToUse);

                            if (totalNeeded.value > balanceCurrency.value) {
                              return Promise.reject(
                                t('send.insufficientFunds')
                              );
                            }
                          }
                        }

                        return Promise.resolve();
                      } catch (error) {
                        // If currency.js can't parse, it's an invalid amount
                        return Promise.reject('');
                      }
                    },
                  }),
                ]}
              >
                <Input
                  name="amount"
                  id="with-max-button"
                  className="value-custom-input"
                  type="number"
                  placeholder={t('send.amount')}
                  onChange={(e) => handleInputChange('amount', e)}
                />
              </Form.Item>
              <span
                className="z-[9999] left-[6%] bottom-[11px] text-xs px-[6px] absolute inline-flex items-center w-[41px] h-[18px] bg-transparent border border-alpha-whiteAlpha300 rounded-[100px] cursor-pointer"
                onClick={handleMaxButton}
              >
                MAX
              </span>
            </div>
          </div>

          <Fee disabled={false} recommend={feeRate} form={form} />

          <div className="flex justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal text-white">
                {selectedAsset ? 'Z-DAG' : 'RBF'}
              </span>
              <Tooltip
                childrenClassName="text-brand-white h-4"
                content={
                  selectedAsset
                    ? t('send.zdagOption', {
                        currency: activeNetwork.currency.toUpperCase(),
                      })
                    : t('send.rbfOption', {
                        currency: activeNetwork.currency.toUpperCase(),
                      })
                }
              >
                <Icon isSvg name="Info" />
              </Tooltip>
            </div>
            <Form.Item
              name="RBF"
              rules={[
                {
                  required: false,
                  message: '',
                },
              ]}
            >
              <Switch
                checked={selectedAsset ? !RBF : RBF}
                onChange={RBFOnChange}
                className="relative inline-flex items-center w-9 h-4 border border-white rounded-full"
              >
                <span
                  className={`${
                    (selectedAsset ? !RBF : RBF)
                      ? 'bg-brand-green translate-x-6'
                      : 'bg-brand-redDark translate-x-1'
                  } inline-block w-2 h-2 transform rounded-full`}
                  id="rbf-switch"
                />
              </Switch>
            </Form.Item>
          </div>

          <div className="relative mt-14 w-[96%] md:static md:mt-3">
            <NeutralButton type="submit" fullWidth loading={isLoading}>
              {t('buttons.next')}
            </NeutralButton>
          </div>
        </Form>
      </div>
    </Layout>
  );
};
