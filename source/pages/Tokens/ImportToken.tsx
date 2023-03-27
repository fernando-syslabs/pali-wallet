import { Form, Input } from 'antd';
import { ethers } from 'ethers';
import { uniqueId } from 'lodash';
import lodash from 'lodash';
import React from 'react';
import { useState, FC } from 'react';
import { useSelector } from 'react-redux';

import {
  getTokenJson,
  getTokenStandardMetadata,
} from '@pollum-io/sysweb3-utils';

import { DefaultModal, ErrorModal, NeutralButton } from 'components/index';
import { useUtils } from 'hooks/index';
import { RootState } from 'state/store';
import { ITokenEthProps } from 'types/tokens';
import { getController } from 'utils/browser';

export const ImportToken: FC = () => {
  const controller = getController();

  const [form] = Form.useForm();
  const { navigate } = useUtils();

  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);

  const { accounts, activeAccountId } = useSelector(
    (state: RootState) => state.vault
  );
  const activeAccount = accounts[activeAccountId];

  const activeNetwork = useSelector(
    (state: RootState) => state.vault.activeNetwork
  );

  const handleSearch = (query: string) => {
    setSelected(null);

    const erc20Tokens = getTokenJson();

    if (!query) return setList(erc20Tokens);

    const filtered = Object.values(erc20Tokens).filter((token: any) => {
      if (!query || !token.name) return token;

      return token.name.toLowerCase().includes(query.toLowerCase());
    });

    setList(filtered);
  };

  const renderTokens = () => {
    const tokensList = list.length > 0 ? list : getTokenJson();

    for (const [key, value] of Object.entries(tokensList)) {
      const tokenValue: any = value;

      tokensList[key] = {
        ...tokenValue,
        contractAddress: key,
      };
    }

    return Object.values(tokensList).map((token: any) => (
      <li
        onClick={() => setSelected(token)}
        key={uniqueId()}
        className={`p-3 hover:text-brand-royalblue flex items-center justify-between text-xs border-b border-dashed cursor-pointer ${
          selected && selected.tokenSymbol === token.tokenSymbol
            ? 'text-brand-royalblue'
            : 'text-brand-white'
        }`}
      >
        <p className="font-rubik text-xl font-bold">{token.tokenSymbol}</p>

        {token.erc20 && <p>ERC-20</p>}
      </li>
    ));
  };

  const addToken = async (token: ITokenEthProps) => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(activeNetwork.url);

      const metadata = await getTokenStandardMetadata(
        token.contractAddress,
        accounts[activeAccount.id].address,
        provider
      );

      const balance = `${metadata.balance / 10 ** Number(token.decimals)}`;
      const formattedBalance = lodash.floor(parseFloat(balance), 4);

      await controller.wallet.account.eth.saveTokenInfo({
        ...token,
        balance: formattedBalance,
      });

      setAdded(true);
    } catch (_error) {
      setError(Boolean(_error));
    }
  };

  return (
    <>
      <Form
        validateMessages={{ default: '' }}
        form={form}
        id="token-form"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 8 }}
        autoComplete="off"
        className="flex flex-col gap-3 items-center justify-center text-center md:w-full"
      >
        <Form.Item
          name="search"
          className="md:w-full md:max-w-md"
          hasFeedback
          rules={[
            {
              required: true,
              message: '',
            },
          ]}
        >
          <Input
            type="text"
            placeholder="Search by symbol"
            className="input-small relative"
            onChange={(event) => handleSearch(event.target.value)}
          />
        </Form.Item>
      </Form>

      <div className="flex flex-col items-center justify-center w-full">
        <ul className="scrollbar-styled my-4 p-4 w-full h-60 overflow-auto">
          {renderTokens()}
        </ul>

        <NeutralButton
          type="button"
          onClick={
            selected ? () => addToken(selected) : () => navigate('/home')
          }
        >
          {selected ? `Import ${selected.tokenSymbol}` : 'Done'}
        </NeutralButton>
      </div>

      {added && (
        <DefaultModal
          show={added}
          title="Token successfully added"
          description={`${selected.tokenSymbol} was successfully added to your wallet.`}
          onClose={() => navigate('/home')}
        />
      )}

      {error && (
        <ErrorModal
          show={error}
          title="Verify the current network"
          description="This token probably is not available in the current network. Verify the token network and try again."
          log="Token network probably is different from current network."
          onClose={() => setError(false)}
        />
      )}
    </>
  );
};
