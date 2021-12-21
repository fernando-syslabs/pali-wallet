import * as React from 'react';
import {
  useState,
  useEffect,
  Fragment,
  FC,
} from 'react';

import {
  useController,
  usePrice,
  useStore,
  useUtils,
  useAccount,
  useTransaction,
  useFormat
} from 'hooks/index';

import { Form, Input } from 'antd';
import { Switch, Menu, Transition } from '@headlessui/react';
import { AuthViewLayout } from 'containers/common/Layout';
import { PrimaryButton, Tooltip, Icon, IconButton } from 'components/index';
import { Assets } from 'scripts/types';
import { ChevronDoubleDownIcon } from '@heroicons/react/solid';

interface ISend {
  initAddress?: string;
}

export const Send: FC<ISend> = () => {
  const getFiatAmount = usePrice();
  const controller = useController();

  const { alert, history } = useUtils();
  const { getAssetBalance, updateSendTemporaryTx } = useTransaction();
  const { activeAccount } = useAccount();
  const { activeNetwork } = useStore();
  const { formatURL } = useFormat();

  const [verifyAddress, setVerifyAddress] = useState<boolean>(true);
  const [ZDAG, setZDAG] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<Assets | null>(null);
  const [recommend, setRecommend] = useState(0.00001);
  const [form] = Form.useForm();

  const handleGetFee = async () => {
    const recommendFee = await controller.wallet.account.getRecommendFee();

    setRecommend(recommendFee);

    form.setFieldsValue({
      fee: recommendFee,
    });
  };

  const handleInitForm = () => {
    handleGetFee();

    form.setFieldsValue({
      verify: true,
      ZDAG: false,
    });
  }

  useEffect(() => {
    handleInitForm();
  }, []);

  const handleSelectedAsset = (item: number) => {
    if (activeAccount?.assets) {
      const getAsset = activeAccount?.assets.find((asset: Assets) => asset.assetGuid == item);

      if (getAsset) {
        setSelectedAsset(getAsset);

        return;
      }

      setSelectedAsset(null);
    }
  };

  const verifyOnChange = (value: any) => {
    setVerifyAddress(value);

    form.setFieldsValue({
      verify: value,
    });
  }

  const ZDAGOnChange = (value: any) => {
    setZDAG(value);

    form.setFieldsValue({
      ZDAG: value,
    });
  }

  const nextStep = (data: any) => {
    const {
      receiver,
      amount,
      fee,
    } = data;

    try {
      updateSendTemporaryTx({
        receiver,
        amount,
        fee,
        token: selectedAsset ? selectedAsset.assetGuid : null,
        controller,
        activeAccount,
        history
      });
    } catch (error) {
      alert.removeAll();
      alert.error('An internal error has occurred.');
    }
  }

  const SendForm = (
  ) => (
    <div className="mt-4">
      <p className="flex flex-col justify-center text-center items-center font-rubik">
        <span className="text-brand-royalBlue font-thin font-poppins">
          Balance
        </span>

        {getAssetBalance(selectedAsset)}
      </p>

      <Form
        form={form}
        id="send"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 8 }}
        initialValues={{
          verify: true,
          ZDAG: false,
          fee: recommend
        }}
        onFinish={nextStep}
        autoComplete="off"
        className="flex justify-center items-center flex-col gap-3 mt-4 text-center"
      >
        <Form.Item
          name="receiver"
          hasFeedback
          rules={[
            {
              required: true,
              message: ''
            },
            () => ({
              validator(_, value) {
                if (!value || controller.wallet.account.isValidSYSAddress(value, activeNetwork, verifyAddress)) {
                  return Promise.resolve();
                }

                return Promise.reject('');
              },
            }),
          ]}
        >
          <Input
            type="text"
            placeholder="Receiver"
            className="outline-none rounded-full py-3 pr-8 w-72 pl-4 bg-brand-navyborder border border-brand-royalBlue text-sm"
          />
        </Form.Item>

        <div className="flex justify-center items-center">
          <Form.Item
            name="asset"
            className=""
            rules={[
              {
                required: false,
                message: ''
              },
            ]}
          >
            <Menu
              as="div"
              className="relative inline-block text-left"
            >
              <Menu.Button
                disabled={!activeAccount?.assets}
                className="bg-brand-navyborder border border-brand-royalBlue inline-flex justify-center w-full px-4 py-3 text-sm font-medium text-white rounded-full hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
              >
                {selectedAsset?.symbol ? formatURL(String(selectedAsset?.symbol), 2) : 'SYS'}

                <ChevronDoubleDownIcon
                  className="w-5 h-5 ml-2 -mr-1 text-violet-200 hover:text-violet-100"
                  aria-hidden="true"
                />
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
                {activeAccount?.assets && activeAccount?.assets.length > 0 && (
                  <Menu.Items
                    className="overflow-auto h-56 bg-brand-navyborder border border-brand-royalBlue text-brand-white w-40 font-poppins shadow-2xl absolute z-10 left-0 mt-2 origin-top-right divide-y divide-gray-100 rounded-2xl ring-1 ring-black ring-opacity-5 focus:outline-none p-1"
                  >
                    <Menu.Item>
                      <button
                        onClick={() => handleSelectedAsset(-1)}
                        className="hover:text-brand-royalBlue text-brand-white font-poppins transition-all duration-300 group flex border-0 border-transparent items-center w-full px-2 py-2 text-sm justify-between"
                      >
                        <p>SYS</p>

                        <small>
                          Native
                        </small>
                      </button>
                    </Menu.Item>

                    {activeAccount?.assets.map((item) => {
                      return (
                        <Menu.Item>
                          <button
                            onClick={() => handleSelectedAsset(item.assetGuid)}
                            className="hover:text-brand-royalBlue text-brand-white font-poppins transition-all duration-300 group flex border-0 border-transparent items-center w-full px-2 py-2 text-sm justify-between"
                          >
                            <p>{item.symbol}</p>

                            <small>
                              {controller.wallet.account.isNFT(item.assetGuid) ? 'NFT' : 'SPT'}
                            </small>
                          </button>
                        </Menu.Item>
                      )
                    })}
                  </Menu.Items>
                )}
              </Transition>
            </Menu>
          </Form.Item>

          <div className="mx-2 flex w-48 gap-x-0.5 justify-center items-center">
            <Form.Item
              name="verify"
              className="flex-1 w-32 bg-brand-navyborder border border-brand-royalBlue rounded-l-full text-center"
              rules={[
                {
                  required: false,
                  message: ''
                },
              ]}
            >
              <Tooltip
                contentClassName="text-brand-white h-4"
                content="Pali verifies your address to check if it is a valid SYS address. It's useful disable this verification if you want to send to specific type of addresses, like legacy. Only disable this verification if you are fully aware of what you are doing."
              >
                <p className="text-10px">
                  Verify address
                </p>
              </Tooltip>

              <Switch
                checked={verifyAddress}
                onChange={verifyOnChange}
                className="relative inline-flex items-center h-4 rounded-full w-9 border border-brand-royalBlue"
              >
                <span className="sr-only">Verify address</span>

                <span
                  className={`${verifyAddress ? 'translate-x-6 bg-brand-green' : 'translate-x-1'
                    } inline-block w-2 h-2 transform bg-brand-error rounded-full`}
                />
              </Switch>
            </Form.Item>

            <Form.Item
              name="ZDAG"
              className="flex-1 w-32 rounded-r-full text-center  bg-brand-navyborder border border-brand-royalBlue"
              rules={[
                {
                  required: false,
                  message: ''
                },
              ]}
            >
              <Tooltip
                contentClassName="text-brand-white h-4"
                content="Disable this option for Replace-by-fee (RBF) and enable for Z-DAG, a exclusive Syscoin feature. Z-DAG enables faster transactions but should not be used for high amounts."
              >
                <p className="text-10px">
                  Z-DAG
                </p>
              </Tooltip>

              <Switch
                checked={ZDAG}
                onChange={ZDAGOnChange}
                className="bg-transparent relative inline-flex items-center h-4 rounded-full w-9 border border-brand-royalBlue"
              >
                <span className="sr-only">Z-DAG</span>

                <span
                  className={`${ZDAG ? 'bg-brand-green translate-x-6' : 'bg-brand-error translate-x-1'
                    } inline-block w-2 h-2 transform rounded-full`}
                />
              </Switch>
            </Form.Item>
          </div>
        </div>

        <Form.Item
          name="amount"
          hasFeedback
          rules={[
            {
              required: true,
              message: '',
              min: 0,
              max: Number(getAssetBalance(selectedAsset)),
            },
          ]}
        >
          <Input
            className="outline-none rounded-full py-3 pr-8 w-72 pl-4 bg-brand-navyborder border border-brand-royalBlue text-sm"
            type="number"
            placeholder="Amount"
          />
        </Form.Item>


        <div className="mx-2 flex gap-x-0.5 justify-center items-center">
          <Form.Item
            name="recommend"
            className="w-12 py-1.5 bg-brand-navyborder border border-brand-royalBlue rounded-l-full text-center"
            rules={[
              {
                required: false,
                message: ''
              },
            ]}
          >
            <Tooltip content="Click to use the recommended fee">
              <IconButton
                onClick={handleGetFee}
              >
                <Icon
                  wrapperClassname="w-6 mb-1"
                  name="verified"
                  className="text-brand-green"
                />
              </IconButton>
            </Tooltip>
          </Form.Item>

          <Form.Item
            name="fee"
            hasFeedback
            rules={[
              {
                required: true,
                message: '',
              },
            ]}
          >
            <Input
              className="outline-none rounded-r-full py-3 pr-8 w-60 pl-4 bg-brand-navyborder border border-brand-royalBlue text-sm"
              type="number"
              placeholder="Fee"
            />
          </Form.Item>
        </div>

        <p className="flex justify-center items-center flex-col text-center p-0 text-brand-royalBlue mx-14">
          <span
            className="text-xs"
          >
            With current network conditions we recommend a fee of {recommend} SYS
          </span>

          <span className="font-rubik text-brand-white mt-0.5 text-xs">
            ≈ {selectedAsset ?
              getFiatAmount(Number(recommend) + Number(recommend), 6) :
              getFiatAmount(Number(recommend), 6)}
          </span>
        </p>

        <PrimaryButton
          type="submit"
        >
          Next
        </PrimaryButton>
      </Form>
    </div>
  )

  return (
    <AuthViewLayout title="SEND SYS">
      <SendForm />
    </AuthViewLayout>
  );
};
