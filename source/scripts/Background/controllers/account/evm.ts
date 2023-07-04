import { getSearch } from '@pollum-io/sysweb3-utils';

import PaliLogo from 'assets/icons/favicon-32.png';
import store from 'state/store';
import { setAccountPropertyByIdAndType } from 'state/vault';
import { ITokenEthProps } from 'types/tokens';

export interface IEthAccountController {
  deleteTokenInfo: (tokenAddress: string) => void;
  saveTokenInfo: (token: ITokenEthProps) => Promise<void>;
}

const EthAccountController = (): IEthAccountController => {
  const saveTokenInfo = async (token: ITokenEthProps) => {
    try {
      const { activeAccount, activeNetwork, accounts } = store.getState().vault;
      const { chainId } = activeNetwork;

      const tokenExists = accounts[activeAccount.type][
        activeAccount.id
      ].assets.ethereum?.find(
        (asset: ITokenEthProps) =>
          asset.contractAddress === token.contractAddress
      );

      if (tokenExists) throw new Error('Token already exists');

      let web3Token: ITokenEthProps;

      const { coins } = await getSearch(token.tokenSymbol);

      if (coins && coins[0]) {
        const { name, thumb } = coins[0];

        web3Token = {
          ...token,
          balance: token.balance,
          name,
          id: token.contractAddress,
          logo: thumb,
          isNft: token.isNft,
          chainId,
        };
      } else {
        web3Token = {
          ...token,
          balance: token.balance,
          name: token.tokenSymbol,
          id: token.contractAddress,
          logo: PaliLogo,
          isNft: token.isNft,
          chainId,
        };
      }

      store.dispatch(
        setAccountPropertyByIdAndType({
          id: activeAccount.id,
          type: activeAccount.type,
          property: 'assets',
          value: {
            ...accounts[activeAccount.type][activeAccount.id].assets,
            ethereum: [
              ...accounts[activeAccount.type][activeAccount.id].assets.ethereum,
              web3Token,
            ],
          },
        })
      );
    } catch (error) {
      throw new Error(`Could not save token info. Error: ${error}`);
    }
  };

  const deleteTokenInfo = (tokenAddress: string) => {
    try {
      const { activeAccount, accounts } = store.getState().vault;

      const tokenExists = accounts[activeAccount.type][
        activeAccount.id
      ].assets.ethereum?.find(
        (asset: ITokenEthProps) => asset.contractAddress === tokenAddress
      );

      if (!tokenExists) throw new Error("Token doesn't exists!");

      store.dispatch(
        setAccountPropertyByIdAndType({
          id: activeAccount.id,
          type: activeAccount.type,
          property: 'assets',
          value: {
            ...accounts[activeAccount.type][activeAccount.id].assets,
            ethereum: accounts[activeAccount.type][
              activeAccount.id
            ].assets.ethereum.filter(
              (currentTokens) => currentTokens.contractAddress !== tokenAddress
            ),
          },
        })
      );
    } catch (error) {
      throw new Error(`Could not delete token. Error: ${error}`);
    }
  };

  return {
    saveTokenInfo,
    deleteTokenInfo,
  };
};
export default EthAccountController;
