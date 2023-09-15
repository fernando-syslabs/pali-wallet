import * as React from 'react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from 'components/index';

import { AssetsPanel, TransactionsPanel } from './Panel/index';

export const TxsPanel: FC = () => {
  const [isActivity, setActivity] = useState<boolean>(true);
  const { t } = useTranslation();

  return (
    <div className="sm:max-h-max flex flex-col items-center w-full max-h-52">
      <div className="flex items-center justify-center w-full text-brand-white text-base border-b border-bkg-1">
        <Button
          className={`flex-1 p-2 ${!isActivity ? 'bg-bkg-3' : 'bg-bkg-1'}`}
          id="assets-btn"
          type="button"
          onClick={() => setActivity(false)}
        >
          {t('buttons.assets')}
        </Button>

        <Button
          className={`flex-1 p-2 ${isActivity ? 'bg-bkg-3' : 'bg-bkg-1'}`}
          id="activity-btn"
          type="button"
          onClick={() => setActivity(true)}
        >
          {t('buttons.activity')}
        </Button>
      </div>

      {isActivity ? <TransactionsPanel /> : <AssetsPanel />}
    </div>
  );
};
