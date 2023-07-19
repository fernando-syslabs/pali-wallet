import { Menu, Transition } from '@headlessui/react';
import { Input, Form } from 'antd';
import { useForm } from 'antd/es/form/Form';
import React, { Fragment, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  Layout,
  Icon,
  DefaultModal,
  NeutralButton,
  Card,
} from 'components/index';
import { useUtils } from 'hooks/index';
import { RootState } from 'state/store';
import { getController } from 'utils/browser';
import { validatePrivateKeyValue } from 'utils/validatePrivateKey';

const ImportAccountView = () => {
  const controller = getController();
  const { navigate, alert } = useUtils();
  const [form] = useForm();
  const { importAccountFromPrivateKey } = controller.wallet;

  //* States
  const [type, setType] = useState('Private Key');
  const [isAccountImported, setIsAccountImported] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { accounts, activeAccount: activeAccountMeta } = useSelector(
    (state: RootState) => state.vault
  );

  const activeAccount = accounts[activeAccountMeta.type][activeAccountMeta.id];

  if (!activeAccount) throw new Error('No account');

  const handleImportAccount = async () => {
    setIsImporting(true);
    if (form.getFieldValue('privKey')) {
      try {
        const account = await importAccountFromPrivateKey(
          form.getFieldValue('privKey'),
          form.getFieldValue('label')
        );

        if (account) setIsAccountImported(true);

        setIsImporting(false);
      } catch (error) {
        alert.removeAll();
        alert.error(String(error.message));
        setIsImporting(false);
      }
    }
  };

  return (
    <Layout title="IMPORT ACCOUNT">
      <DefaultModal
        show={isAccountImported}
        onClose={() => navigate('/home')}
        title="Account imported successfully"
      />

      <p className="mb-8 text-center text-white text-sm">
        Imported accounts won't link to your initial Pali account Secret
        Recovery Phrase.
      </p>
      <div className="flex flex-col items-center justify-center w-full md:max-w-full mb-2">
        <Card type="info" className="border-alert-darkwarning">
          <div className="text-xs text-alert-darkwarning font-bold mb-2.5">
            <p>
              WARNING: Currently, the privateKeys feature is only supported in
              the EVM/Web3 chains context. Therefore, UTXO networks won't be
              accessible while using a PrivateKey account. To regain access to
              UTXO networks, switch to a Pali Native Account or a Trezor
              Account.
            </p>
          </div>
        </Card>
      </div>

      <p className="mb-2 mt-5 text-left text-white text-sm md:max-w-full">
        Select Type
      </p>

      <div className="flex flex-col gap-y-5 items-center justify-center">
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="inline-flex justify-center py-2 w-80 text-white text-sm font-medium bg-fields-input-primary border border-fields-input-border focus:border-fields-input-borderfocus rounded-full">
            <p>{type}</p>

            <Icon
              name="select-down"
              className="text-brand-royalblue"
              wrapperClassname="w-8 absolute right-20 bottom-3"
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
            <Menu.Items
              as="div"
              className="scrollbar-styled absolute z-10 mt-2 py-3 w-full h-44 text-brand-white font-poppins bg-bkg-4 border border-fields-input-border rounded-xl shadow-2xl overflow-auto origin-top-right"
            >
              {['Private key'].map((key) => (
                <Menu.Item as="div" key={key}>
                  <button
                    key={key}
                    className="group flex gap-x-1 items-center justify-start px-4 py-2 w-full hover:text-brand-royalbluemedium text-brand-white font-poppins text-sm border-0 border-b border-dashed border-brand-royalblue border-transparent border-opacity-30 transition-all duration-300"
                    onClick={() => setType(key)}
                  >
                    <p>{key}</p>
                  </button>
                </Menu.Item>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>

        <div className="flex flex-col items-center justify-center text-center">
          <Form
            validateMessages={{ default: '' }}
            className="flex flex-col gap-5 items-center justify-center text-center md:w-full mb-10"
            name="newaccount"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            autoComplete="off"
            form={form}
          >
            <Form.Item
              name="label"
              className="md:w-full"
              hasFeedback
              rules={[
                {
                  required: false,
                  message: '',
                },
              ]}
            >
              <Input
                type="text"
                className="input-small relative"
                placeholder="Label (optional)"
                id="account-name-input"
              />
            </Form.Item>
            <Form.Item
              name="privKey"
              className="md:w-full"
              hasFeedback
              rules={[
                {
                  required: true,
                  message: '',
                },
                () => ({
                  async validator(_, value) {
                    if (validatePrivateKeyValue(value)) {
                      return Promise.resolve();
                    }
                    return Promise.reject();
                  },
                }),
              ]}
            >
              <Input
                type="text"
                className="input-small relative"
                placeholder="Your Private Key"
                id="account-name-input"
              />
            </Form.Item>

            <NeutralButton
              type="button"
              loading={isImporting}
              onClick={handleImportAccount}
            >
              Import
            </NeutralButton>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default ImportAccountView;
