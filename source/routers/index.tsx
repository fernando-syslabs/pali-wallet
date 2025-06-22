import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AppLayout } from 'components/Layout/AppLayout';
import { WarningModal } from 'components/Modal';
import { useRouterLogic } from 'routers/useRouterLogic';

import { ProtectedRoute } from './ProtectedRoute';

// Lazy load route groups
const AuthRoutes = lazy(() => import('./routes/AuthRoutes'));

// Lazy load components with proper imports
const About = lazy(() => import('pages').then((m) => ({ default: m.About })));
const ConnectedSites = lazy(() =>
  import('pages').then((m) => ({ default: m.ConnectedSites }))
);
const ConnectHardwareWallet = lazy(() =>
  import('pages').then((m) => ({ default: m.ConnectHardwareWallet }))
);
const CreateAccount = lazy(() =>
  import('pages').then((m) => ({ default: m.CreateAccount }))
);
const CreatePass = lazy(() =>
  import('pages').then((m) => ({ default: m.CreatePass }))
);
const Currency = lazy(() =>
  import('pages').then((m) => ({ default: m.Currency }))
);
const CustomRPC = lazy(() =>
  import('pages').then((m) => ({ default: m.CustomRPC }))
);
const ForgetWallet = lazy(() =>
  import('pages').then((m) => ({ default: m.ForgetWallet }))
);
const DetailsView = lazy(() =>
  import('pages').then((m) => ({ default: m.DetailsView }))
);
const ManageNetwork = lazy(() =>
  import('pages').then((m) => ({ default: m.ManageNetwork }))
);
const Home = lazy(() => import('pages').then((m) => ({ default: m.Home })));
const Import = lazy(() => import('pages').then((m) => ({ default: m.Import })));
const PrivateKey = lazy(() =>
  import('pages').then((m) => ({ default: m.PrivateKey }))
);
const Receive = lazy(() =>
  import('pages').then((m) => ({ default: m.Receive }))
);
const SendEth = lazy(() =>
  import('pages').then((m) => ({ default: m.SendEth }))
);
const SendSys = lazy(() =>
  import('pages').then((m) => ({ default: m.SendSys }))
);
const SendConfirm = lazy(() =>
  import('pages').then((m) => ({ default: m.SendConfirm }))
);
const Start = lazy(() => import('pages').then((m) => ({ default: m.Start })));
const TrustedSites = lazy(() =>
  import('pages').then((m) => ({ default: m.TrustedSites }))
);
const AddToken = lazy(() =>
  import('pages').then((m) => ({ default: m.AddToken }))
);
const SeedConfirm = lazy(() =>
  import('pages').then((m) => ({ default: m.SeedConfirm }))
);
const Phrase = lazy(() => import('pages').then((m) => ({ default: m.Phrase })));
const ImportAccount = lazy(() =>
  import('pages').then((m) => ({ default: m.ImportAccount }))
);
const RemoveEth = lazy(() =>
  import('pages').then((m) => ({ default: m.RemoveEth }))
);
const CreatePasswordImport = lazy(() =>
  import('pages').then((m) => ({ default: m.CreatePasswordImport }))
);
const ManageAccounts = lazy(() =>
  import('pages').then((m) => ({ default: m.ManageAccounts }))
);
const EditAccount = lazy(() =>
  import('pages').then((m) => ({ default: m.EditAccount }))
);
const Advanced = lazy(() =>
  import('pages').then((m) => ({ default: m.Advanced }))
);
const Languages = lazy(() =>
  import('pages').then((m) => ({ default: m.Languages }))
);
const ChainErrorPage = lazy(() =>
  import('pages/Chain/ChainErrorPage').then((m) => ({
    default: m.ChainErrorPage,
  }))
);
const Faucet = lazy(() =>
  import('pages/Faucet').then((m) => ({ default: m.Faucet }))
);
const SwitchNetwork = lazy(() =>
  import('pages/SwitchNetwork').then((m) => ({ default: m.SwitchNetwork }))
);

export const Router = () => {
  const {
    showModal,
    setShowModal,
    modalMessage,
    showUtf8ErrorModal,
    t,
    handleUtf8ErrorClose,
    warningMessage,
  } = useRouterLogic();

  return (
    <>
      <WarningModal
        show={showUtf8ErrorModal}
        title={t('settings.bgError')}
        description={t('settings.bgErrorMessage')}
        onClose={handleUtf8ErrorClose}
      />
      <WarningModal
        show={showModal}
        title="RPC Error"
        description={`${modalMessage}`}
        warningMessage={warningMessage}
        onClose={() => setShowModal(false)}
      />
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full min-h-popup bg-bkg-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        }
      >
        <Routes>
          {/* Auth Routes - No persistent layout */}
          <Route path="/" element={<AuthRoutes />}>
            <Route path="/" element={<Start />} />
            <Route path="create-password" element={<CreatePass />} />
            <Route
              path="create-password-import"
              element={<CreatePasswordImport />}
            />
            <Route path="import" element={<Import />} />
            <Route path="phrase" element={<SeedConfirm />} />
          </Route>

          {/* Special route for switch-network that needs different handling */}
          <Route path="switch-network" element={<SwitchNetwork />} />

          {/* All protected routes wrapped in AppLayout for persistent header */}
          <Route element={<ProtectedRoute element={<AppLayout />} />}>
            {/* Home Routes */}
            <Route path="/home" element={<Home />} />
            <Route path="/home/details" element={<DetailsView />} />

            {/* Transaction Routes */}
            <Route path="/receive" element={<Receive />} />
            <Route path="/faucet" element={<Faucet />} />
            <Route path="/send/eth" element={<SendEth />} />
            <Route path="/send/sys" element={<SendSys />} />
            <Route path="/send/confirm" element={<SendConfirm />} />

            {/* Network Routes */}
            <Route path="/chain-fail-to-connect" element={<ChainErrorPage />} />
            <Route path="/tokens/add" element={<AddToken />} />

            {/* Settings Routes */}
            <Route path="/settings/about" element={<About />} />
            <Route path="/settings/remove-eth" element={<RemoveEth />} />
            <Route path="/settings/advanced" element={<Advanced />} />
            <Route path="/settings/languages" element={<Languages />} />
            <Route path="/settings/currency" element={<Currency />} />
            <Route path="/settings/forget-wallet" element={<ForgetWallet />} />
            <Route path="/settings/seed" element={<Phrase />} />
            <Route
              path="/settings/manage-accounts"
              element={<ManageAccounts />}
            />
            <Route path="/settings/edit-account" element={<EditAccount />} />

            {/* Account sub-routes */}
            <Route
              path="/settings/account/hardware"
              element={<ConnectHardwareWallet />}
            />
            <Route path="/settings/account/new" element={<CreateAccount />} />
            <Route
              path="/settings/account/import"
              element={<ImportAccount />}
            />
            <Route
              path="/settings/account/private-key"
              element={<PrivateKey />}
            />

            {/* Network sub-routes */}
            <Route
              path="/settings/networks/connected-sites"
              element={<ConnectedSites />}
            />
            <Route
              path="/settings/networks/custom-rpc"
              element={<CustomRPC />}
            />
            <Route path="/settings/networks/edit" element={<ManageNetwork />} />
            <Route
              path="/settings/networks/trusted-sites"
              element={<TrustedSites />}
            />
          </Route>

          <Route
            path="app.html"
            element={<Navigate to={{ pathname: '/' }} />}
          />
        </Routes>
      </Suspense>
    </>
  );
};
