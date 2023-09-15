import { uniqueId } from 'lodash';
import React, { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { IconButton, Icon, LoadingComponent } from 'components/index';
import { useUtils } from 'hooks/index';
import { RootState } from 'state/store';
import { ellipsis, formatCurrency, truncate } from 'utils/index';

export const SyscoinAssetsList = () => {
  const {
    accounts,
    activeAccount,
    isLoadingAssets,
    activeNetwork: { chainId },
  } = useSelector((state: RootState) => state.vault);
  const { assets } = accounts[activeAccount.type][activeAccount.id];
  const { navigate } = useUtils();
  const { t } = useTranslation();

  const filteredAssets = assets.syscoin.filter(
    (asset) => asset.chainId === chainId
  );

  return (
    <>
      {isLoadingAssets ? (
        <LoadingComponent />
      ) : (
        <>
          {filteredAssets?.map(
            ({ decimals, balance, symbol, assetGuid }: any) => (
              <Fragment key={uniqueId(String(assetGuid))}>
                <li className="flex items-center py-3 text-xs border-b border-dashed border-bkg-white200">
                  <table className="table-auto w-full">
                    <tbody>
                      <tr className="flex items-center justify-between">
                        <td className="flex items-center">
                          <p
                            className="text-left font-poppins font-normal"
                            style={{ width: '120px' }}
                          >
                            <span className="text-brand-white">
                              {truncate(
                                formatCurrency(
                                  String(balance / 10 ** decimals),
                                  decimals
                                ),
                                14
                              )}
                            </span>

                            <span className="text-brand-blue100">
                              {`  ${truncate(symbol, 10).toUpperCase()}`}
                            </span>
                          </p>
                        </td>

                        <td className="flex items-center text-left">
                          <span
                            className="w-full text-brand-white font-poppins text-xs font-normal"
                            style={{
                              width: 'fit-content',
                            }}
                          >
                            {t('send.assetGuid')}
                          </span>
                        </td>

                        <td className="flex items-center max-w-max text-left whitespace-nowrap overflow-hidden overflow-ellipsis">
                          <span
                            className="w-full text-brand-assetGuidText font-poppins text-xs font-normal"
                            style={{ width: '75px' }}
                          >
                            {ellipsis(assetGuid, 4)}
                          </span>
                        </td>

                        <td className="flex items-center">
                          <IconButton
                            onClick={() =>
                              navigate('/home/details', {
                                state: { id: assetGuid, hash: null },
                              })
                            }
                          >
                            <Icon
                              name="external-link"
                              className="w-4 text-brand-white"
                            />
                          </IconButton>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </li>
              </Fragment>
            )
          )}
        </>
      )}
    </>
  );
};
