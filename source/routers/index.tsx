import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';

import { CustomJsonRpcProvider } from '@pollum-io/sysweb3-keyring';

import {
  About,
  AutoLock,
  ConnectedSites,
  ConnectHardwareWallet,
  CreateAccount,
  CreatePass,
  Currency,
  CustomRPC,
  ForgetWallet,
  DetailsView,
  ManageNetwork,
  Home,
  Import,
  PrivateKey,
  Receive,
  SendEth,
  SendSys,
  SendConfirm,
  Start,
  TrustedSites,
  AddToken,
  SeedConfirm,
  Phrase,
  ImportAccount,
  RemoveEth,
  CreatePasswordImport,
} from '../pages';
import { WarningModal } from 'components/Modal';
import { useUtils } from 'hooks/index';
import {
  inactivityTime,
  removeVerifyPaliRequestListener,
  resetPaliRequestsCount,
  verifyPaliRequests,
} from 'scripts/Background';
import { RootState } from 'state/store';
import { getController } from 'utils/browser';

import { ProtectedRoute } from './ProtectedRoute';
export const Router = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMessage, setmodalMessage] = useState<string>('');
  const { wallet, appRoute } = getController();
  const { alert, navigate } = useUtils();
  const { pathname } = useLocation();
  const { isTimerEnabled, isBitcoinBased, isNetworkChanging } = useSelector(
    (state: RootState) => state.vault
  );
  const accounts = useSelector((state: RootState) => state.vault.accounts);
  const { serverHasAnError, errorMessage }: CustomJsonRpcProvider =
    wallet.ethereumTransaction.web3Provider;
  const isUnlocked = wallet.isUnlocked();

  useEffect(() => {
    const canProceed = isUnlocked && accounts;

    if (canProceed) {
      navigate('/home');

      return;
    }

    const route = appRoute();
    if (route !== '/') navigate(route);
  }, [isUnlocked]);

  useEffect(() => {
    if (isTimerEnabled) inactivityTime();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (isNetworkChanging) resetPaliRequestsCount();
      if (!isBitcoinBased) verifyPaliRequests();
      if (isBitcoinBased) removeVerifyPaliRequestListener();
    }
  }, [isBitcoinBased, isNetworkChanging]);

  useEffect(() => {
    alert.removeAll();
    appRoute(pathname);
  }, [pathname]);

  useEffect(() => {
    if (
      serverHasAnError &&
      isUnlocked &&
      !isBitcoinBased &&
      !isNetworkChanging
    ) {
      if (errorMessage !== 'string' && errorMessage?.code === -32016) {
        setmodalMessage(
          'The current RPC provider has a low rate-limit. We are applying a cooldown that will affect Pali performance. Modify the RPC URL in the network settings to resolve this issue.'
        );
      } else {
        setmodalMessage(
          'The RPC provider from network has an error. Pali performance may be affected. Modify the RPC URL in the network settings to resolve this issue.'
        );
      }
      setShowModal(true);
    }
  }, [serverHasAnError]);

  return (
    <>
      <WarningModal
        show={showModal}
        title="RPC Error"
        description={`${modalMessage}`}
        warningMessage={`Provider Error: ${
          errorMessage === 'string' || typeof errorMessage === 'undefined'
            ? errorMessage
            : errorMessage.message
        }`}
        onClose={() => setShowModal(false)}
      />
      <Routes>
        <Route path="/" element={<Start />} />

        <Route path="create-password" element={<CreatePass />} />
        <Route
          path="create-password-import"
          element={<CreatePasswordImport />}
        />
        <Route path="import" element={<Import />} />
        <Route path="phrase" element={<SeedConfirm />} />

        <Route path="home" element={<ProtectedRoute element={<Home />} />} />
        <Route
          path="home/details"
          element={<ProtectedRoute element={<DetailsView />} />}
        />

        <Route
          path="/receive"
          element={<ProtectedRoute element={<Receive />} />}
        />

        <Route
          path="send/eth"
          element={<ProtectedRoute element={<SendEth />} />}
        />

        <Route
          path="send/sys"
          element={<ProtectedRoute element={<SendSys />} />}
        />
        <Route
          path="send/confirm"
          element={<ProtectedRoute element={<SendConfirm />} />}
        />
        <Route
          path="send/edit/gas"
          element={<ProtectedRoute element={<SendConfirm />} />}
        />

        {/* /tokens/add */}
        <Route
          path="tokens/add"
          element={<ProtectedRoute element={<AddToken />} />}
        />

        {/* /settings */}
        <Route path="settings">
          <Route
            path="about"
            element={<ProtectedRoute element={<About />} />}
          />
          <Route
            path="autolock"
            element={<ProtectedRoute element={<AutoLock />} />}
          />
          <Route
            path="remove-eth"
            element={<ProtectedRoute element={<RemoveEth />} />}
          />
          <Route
            path="currency"
            element={<ProtectedRoute element={<Currency />} />}
          />
          <Route
            path="forget-wallet"
            element={<ProtectedRoute element={<ForgetWallet />} />}
          />
          <Route
            path="seed"
            element={<ProtectedRoute element={<Phrase />} />}
          />

          {/* /settings/account */}
          <Route path="account">
            <Route
              path="hardware"
              element={<ProtectedRoute element={<ConnectHardwareWallet />} />}
            />
            <Route
              path="new"
              element={<ProtectedRoute element={<CreateAccount />} />}
            />
            <Route
              path="import"
              element={<ProtectedRoute element={<ImportAccount />} />}
            />

            <Route
              path="private-key"
              element={<ProtectedRoute element={<PrivateKey />} />}
            />
          </Route>

          {/* /settings/networks */}
          <Route path="networks">
            <Route
              path="connected-sites"
              element={<ProtectedRoute element={<ConnectedSites />} />}
            />
            <Route
              path="custom-rpc"
              element={<ProtectedRoute element={<CustomRPC />} />}
            />
            <Route
              path="edit"
              element={<ProtectedRoute element={<ManageNetwork />} />}
            />
            <Route
              path="trusted-sites"
              element={<ProtectedRoute element={<TrustedSites />} />}
            />
          </Route>
        </Route>

        <Route path="app.html" element={<Navigate to={{ pathname: '/' }} />} />
      </Routes>
    </>
  );
};
