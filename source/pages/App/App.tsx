import React, { FC, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { browser } from 'webextension-polyfill-ts';

import { Container } from 'components/index';
import { Router } from 'routers/index';
import { RootState } from 'state/store';

const App: FC = () => {
  const { isNetworkChanging } = useSelector((state: RootState) => state.vault);
  // establish a connection with the background script

  // function to stop the polling
  const stopPolling = () => {
    console.log('stop polling');
    browser.runtime.sendMessage({ action: 'startPolling' });
  };
  console.log('App', isNetworkChanging);

  useEffect(() => {
    console.log('useEffect App');
    if (isNetworkChanging) {
      stopPolling();
    }
  }, [isNetworkChanging]);

  return (
    <section className="mx-auto min-w-popup h-full min-h-popup bg-bkg-2 md:max-w-2xl">
      <Container>
        <BrowserRouter>
          <div className="w-full min-w-popup h-full min-h-popup">
            <Router />
          </div>
        </BrowserRouter>
      </Container>
    </section>
  );
};

export default App;
