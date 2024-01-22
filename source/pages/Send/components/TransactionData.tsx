import React from 'react';
import { useTranslation } from 'react-i18next';

import { IDecodedTx } from 'types/transactions';

interface ITransactionDataProps {
  decodedTx: IDecodedTx;
}

export const TransactionDataComponent = (props: ITransactionDataProps) => {
  const { decodedTx } = props;
  const { t } = useTranslation();
  return (
    <div className="flex p-6 rounded-[20px] flex-col items-center justify-center bg-brand-blue600 w-[400px] h-[420px] relative left-[-1%]">
      {decodedTx.method === 'Contract Interaction' ? (
        <div
          className="flex items-center justify-center mt-2 p-4 w-full text-xs rounded-xl"
          style={{ backgroundColor: 'rgba(22, 39, 66, 1)' }}
        >
          <p>{t('send.decodificationNotAvailable')}</p>
        </div>
      ) : (
        <pre className="scrollbar-styled mb-6 mt-2 px-2.5 py-1  max-h-80 text-xs rounded-xl overflow-y-scroll whitespace-pre-wrap">
          {JSON.stringify(decodedTx, null, '\t')}
        </pre>
      )}
    </div>
  );
};
