import React, { useState } from 'react';
import { useFormat, useAccount, useUtils, useController } from 'hooks/index';
import {
  Layout,
  Icon,
  SecondaryButton,
  Card,
  CopyCard,
} from 'components/index';
import { Disclosure } from '@headlessui/react';
import { Input, Form } from 'antd';

const PrivateKeyView = () => {
  const controller = useController();
  const { navigate, useCopyClipboard } = useUtils();
  const { activeAccount } = useAccount();
  const { ellipsis } = useFormat();

  const [copied, copyText] = useCopyClipboard();
  const [valid, setValid] = useState<boolean>(false);

  const sysExplorer = controller.wallet.account.getSysExplorerSearch();

  return (
    <Layout title="YOUR KEYS">
      <div className="scrollbar-styled px-2 py-5 h-96 overflow-auto">
        <Card type="info">
          <p>
            <b className="text-warning-info">WARNING: </b>
            This is your account root indexer to check your full balance for{' '}
            {activeAccount?.label}, it isn't a receiving address. DO NOT SEND
            FUNDS TO THESE ADDRESSES, YOU WILL LOOSE THEM!
          </p>
        </Card>

        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button
                className={`${
                  open ? 'rounded-t-lg' : 'rounded-lg'
                } w-full max-w-xs md:max-w-md px-4 mt-6 py-2 flex justify-between items-center border border-bkg-1 text-xs cursor-pointer transition-all duration-300 bg-bkg-1`}
              >
                XPUB
                <Icon
                  name="select-down"
                  className={`${
                    open ? 'transform rotate-180' : ''
                  } mb-1 text-brand-white`}
                />
              </Disclosure.Button>

              <Disclosure.Panel className="flex flex-col items-start justify-start px-4 py-4 w-80 bg-bkg-3 border border-bkg-3 rounded-b-lg cursor-pointer transition-all duration-300">
                <div
                  className="flex items-center justify-between w-full text-xs"
                  onClick={() => copyText(String(activeAccount?.xpub))}
                >
                  <p>{ellipsis(activeAccount?.xpub, 4, 16)}</p>

                  <Icon name="copy" className="mb-1 text-brand-white" />
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        <p className="mt-4 text-xs">
          To see your private key, input your password
        </p>

        <Form
          className="password flex flex-col gap-8 items-center justify-center my-3 w-full max-w-xs text-center md:max-w-md"
          name="phraseview"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          autoComplete="off"
        >
          <Form.Item
            name="password"
            hasFeedback
            className="w-full"
            rules={[
              {
                required: true,
                message: '',
              },
              () => ({
                validator(_, value) {
                  if (controller.wallet.getPhrase(value)) {
                    setValid(true);

                    return Promise.resolve();
                  }

                  return Promise.reject();
                },
              }),
            ]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>
        </Form>

        <CopyCard
          onClick={
            valid ? () => copyText(String(activeAccount?.xprv)) : undefined
          }
          label="Your private key"
        >
          <p>
            {valid
              ? ellipsis(activeAccount?.xprv, 4, 16)
              : '********...************'}
          </p>
        </CopyCard>

        <div
          className="flex gap-2 items-center justify-center mt-4 hover:text-brand-royalblue text-xs cursor-pointer"
          onClick={() =>
            window.open(`${sysExplorer}/xpub/${activeAccount?.xpub}`)
          }
        >
          <p>View account on explorer</p>

          <Icon name="select" className="mb-1" />
        </div>
      </div>

      <div className="sm:absolute sm:bottom-48">
        <SecondaryButton type="button" onClick={() => navigate('/home')}>
          {copied ? 'Copied' : 'Close'}
        </SecondaryButton>
      </div>
    </Layout>
  );
};

export default PrivateKeyView;
