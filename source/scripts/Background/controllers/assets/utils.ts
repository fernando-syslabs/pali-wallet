import clone from 'lodash/clone';
import compact from 'lodash/compact';
import flatMap from 'lodash/flatMap';
import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';
import uniqWith from 'lodash/uniqWith';

import store from 'state/store';
import { ITokenEthProps } from 'types/tokens';

import { ISysTokensAssetReponse } from './types';

export const validateAndManageUserAssets = (
  isForEvm: boolean,
  fetchedAssetsOrTokens: ISysTokensAssetReponse[] | ITokenEthProps[]
) => {
  if (fetchedAssetsOrTokens.length === 0) return [];

  const { activeAccount, accountAssets } = store.getState().vault;

  const assets = accountAssets[activeAccount.type]?.[activeAccount.id];

  const assetsValueToUse = isForEvm ? assets?.ethereum : assets?.syscoin;
  //@ts-ignore
  const userClonedAssets = clone(compact(assetsValueToUse));

  const tokenPropertyToUseAtGroupBy = isForEvm
    ? 'contractAddress'
    : 'assetGuid';

  const validateIfTokensIsEquals = isEqual(
    sortBy(userClonedAssets, tokenPropertyToUseAtGroupBy),
    sortBy(fetchedAssetsOrTokens, tokenPropertyToUseAtGroupBy)
  );

  //Return a empty array to we don't need to dispatch something at the Polling
  if (validateIfTokensIsEquals) {
    return [];
  }

  //If the arrays is not equal, we have only to trust in the new fetchedValue because the assets can be
  //With a bigger os smaller value from balance, we can't use maxBy to validate it. So we filter by assetGuid or contractAddres
  //And order / sort it by balance value, to keep the biggests ones at first positions
  return uniqWith(
    flatMap(fetchedAssetsOrTokens).sort(
      (a, b) => (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0)
    ),
    (a, b) => a[tokenPropertyToUseAtGroupBy] === b[tokenPropertyToUseAtGroupBy]
  );
};

export const ensureTrailingSlash = (url: string): string => {
  // Check the last character using charAt
  if (url && url.charAt(url.length - 1) !== '/') {
    url += '/';
  }
  return url;
};
