import { validateEthRpc, validateSysRpc } from '@pollum-io/sysweb3-network';
import {
  getSearch,
  isValidEthereumAddress,
  isValidSYSAddress,
  getToken,
  getTokenJson,
  getTokenByContract,
  getAsset,
  txUtils,
  getFiatValueByToken,
} from '@pollum-io/sysweb3-utils';

import { ASSET_PRICE_API } from 'constants/index';
import { setPrices, setCoins } from 'state/price';
import store from 'state/store';
import { IControllerUtils } from 'types/controllers';
import { logError } from 'utils/index';

const ControllerUtils = (): IControllerUtils => {
  let route = '/';
  let externalRoute = '/';

  const appRoute = (newRoute?: string, external = false) => {
    if (newRoute) {
      if (external) externalRoute = newRoute;
      else route = newRoute;
    }

    return external ? externalRoute : route;
  };

  const setFiat = async (currency?: string) => {
    if (!currency) {
      const storeCurrency = store.getState().price.fiat.asset;
      currency = storeCurrency || 'usd';
    }

    const { activeNetwork, isBitcoinBased } = store.getState().vault;

    const id = isBitcoinBased ? 'syscoin' : 'ethereum';

    switch (id) {
      case 'syscoin':
        try {
          //TODO: validateSysRpc should not be called here
          const { chain } = await validateSysRpc(activeNetwork.url);

          // const getFiatForSys = await getFiatValueByToken(id, currency);

          // const price = chain === 'test' ? 0 : getFiatForSys;
          //TODO:This asset price API won't fetch the price for other currencies apart of sys
          // const currencies = await (
          //   await fetch(`${ASSET_PRICE_API}/currency`)
          // ).json();

          // if (currencies && currencies.rates) {
          //   store.dispatch(setCoins(currencies.rates));
          // }

          // store.dispatch(
          //   setPrices({
          //     asset: currency,
          //     price,
          //   })
          // );
        } catch (error) {
          logError('Failed to retrieve asset price', '', error);
        }
        break;

      case 'ethereum':
        try {
          const { chain, chainId } = await validateEthRpc(activeNetwork.url);

          const ethTestnetsChainsIds = [5700, 80001, 11155111, 421611, 5, 69]; // Some ChainIds from Ethereum Testnets as Polygon Testnet, Goerli, Sepolia, etc.

          if (
            Boolean(
              chain === 'testnet' ||
                ethTestnetsChainsIds.some(
                  (validationChain) => validationChain === chainId
                )
            )
          ) {
            store.dispatch(
              setPrices({
                asset: currency,
                price: 0,
              })
            );

            return;
          }

          const getCoinList = await (
            await fetch('https://api.coingecko.com/api/v3/coins/list')
          ).json();

          if (getCoinList.length > 0 && !getCoinList?.status?.error_code) {
            const { id: findCoinSymbolByNetwork } = getCoinList?.find(
              (coin) => coin.symbol === activeNetwork.currency
            );

            const coins = await (
              await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${findCoinSymbolByNetwork}&order=market_cap_desc&per_page=100&page=1&sparkline=false`
              )
            ).json();

            const currentNetworkCoinMarket = coins[0].current_price;

            store.dispatch(
              setPrices({
                asset: currency,
                price: currentNetworkCoinMarket ? currentNetworkCoinMarket : 0,
              })
            );

            return;
          }

          const lastCoinsPrices = store.getState().price.coins;

          const findLastCurrencyValue = lastCoinsPrices[currency];

          store.dispatch(
            setPrices({
              asset: currency,
              price: findLastCurrencyValue,
            })
          );

          return;
        } catch (error) {
          logError('Failed to retrieve asset price', '', error);
        }
        break;
    }
  };

  const txs = txUtils();

  return {
    appRoute,
    setFiat,
    getSearch,
    getAsset,
    isValidEthereumAddress,
    isValidSYSAddress,
    getTokenJson,
    getToken,
    getTokenByContract,
    ...txs,
  };
};

export default ControllerUtils;
