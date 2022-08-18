import store from 'state/store';

export const isActiveNetwork = (chain: string, chainId: number) => {
  const { activeNetwork, networks } = store.getState().vault;
  const isSysCore =
    Boolean(networks.syscoin[activeNetwork.chainId]) &&
    activeNetwork.url.includes('blockbook');
  const activeChain = isSysCore ? 'syscoin' : 'ethereum';

  const isSameChain = chain === activeChain;
  const isSameChainId = activeNetwork.chainId === chainId;

  return isSameChain && isSameChainId;
};
