import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { browser } from 'webextension-polyfill-ts';

import { Header, Icon, IconButton, Tooltip } from 'components/index';

interface ILayout {
  canGoBack?: boolean;
  children: React.ReactNode;
  id?: string;
  title: string;
  titleOnly?: boolean;
}

export const Layout: FC<ILayout> = ({
  canGoBack = true,
  children,
  id = '',
  title,
  titleOnly,
}) => {
  const navigate = useNavigate();

  const url = browser.runtime.getURL('app.html');

  return (
    <div className="relative w-full min-w-popup h-full min-h-popup text-brand-white bg-bkg-2">
      {!titleOnly && canGoBack && <Header />}

      <div className="relative flex items-center justify-center pt-6 w-full text-brand-white bg-bkg-3">
        {!titleOnly && url && canGoBack && (
          <Tooltip content="Fullscreen mode">
            <IconButton onClick={() => window.open(url)}>
              <Icon
                className="absolute bottom-1 left-5 text-brand-white sm:hidden"
                name="desktop"
              />
            </IconButton>
          </Tooltip>
        )}

        <p className="w-full text-center text-xl" id={id}>
          {title}
        </p>

        {!titleOnly && canGoBack && (
          <IconButton onClick={() => navigate('/home')}>
            <Icon wrapperClassname="absolute bottom-1 right-4" name="close" />
          </IconButton>
        )}
      </div>

      <div className="relative flex items-center justify-center mb-3 pb-3 pt-2 bg-bkg-3">
        <Icon
          size={36}
          name="select-up"
          wrapperClassname="w-8"
          className={`fixed ${
            titleOnly ? 'top-12' : 'top-24'
          } text-bkg-2 md:top-36`}
          color="#111E33"
        />
      </div>

      <div className="flex flex-col items-center justify-center mx-auto w-full max-w-sm text-brand-white bg-bkg-2 sm:max-w-full">
        {children}
      </div>
    </div>
  );
};
