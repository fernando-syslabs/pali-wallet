/* eslint-disable react/prop-types */
import { Switch } from '@headlessui/react';
import { Form, Input } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { debounce } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import {
  validateEthRpc,
  validateSysRpc,
  INetworkType,
} from '@pollum-io/sysweb3-network';

import { ChainIcon } from 'components/ChainIcon';
import { Button, Layout, Tooltip, Icon } from 'components/index';
import { StatusModal } from 'components/Modal/StatusModal';
import { RPCSuccessfullyAdded } from 'components/Modal/WarningBaseModal';
import { useUtils } from 'hooks/index';
import { useController } from 'hooks/useController';
import ChainListService, {
  type ChainInfo,
} from 'scripts/Background/controllers/chainlist';
import { RootState } from 'state/store';
import { ICustomRpcParams } from 'types/transactions';

const CustomRPCView = () => {
  const { state }: { state: any } = useLocation();
  const { t } = useTranslation();
  const networks = useSelector(
    (reduxState: RootState) => reduxState.vault.networks
  );
  const isSyscoinSelected = state && state.chain && state.chain === 'syscoin';
  // When editing, determine network type from the selected network
  const [loading, setLoading] = useState(false);

  const [addedRpc, setAddedRpc] = useState<boolean>(false);
  const [showModal, setShowModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string>('');
  const [isSyscoinRpc, setIsSyscoinRpc] = useState(() => {
    if (state?.isEditing && state?.selected) {
      return state.selected.kind === INetworkType.Syscoin;
    }
    return Boolean(isSyscoinSelected);
  });
  const [networkSuggestions, setNetworkSuggestions] = useState<ChainInfo[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [testingRpcs, setTestingRpcs] = useState(false);
  const [allChains, setAllChains] = useState<ChainInfo[]>([]);
  const [currentRpcTest, setCurrentRpcTest] = useState<{
    index: number;
    total: number;
    url: string;
  } | null>(null);

  const { controllerEmitter } = useController();
  const { alert, navigate } = useUtils();

  const [form] = useForm();
  const urlInputRef = React.useRef<any>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const switchBallStyle = isSyscoinRpc
    ? 'translate-x-6 bg-brand-deepPink100'
    : 'translate-x-1  bg-brand-blue200';

  const inputHiddenOrNotStyle = isSyscoinRpc ? 'hidden' : 'relative';

  const modalMessageOnSuccessful = state
    ? t('settings.rpcSuccessfullyEdited')
    : t('settings.rpcSuccessfullyAdded');

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);

      // Must be http or https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Must have a hostname
      if (!urlObj.hostname) {
        return false;
      }

      // For localhost/IP addresses, skip domain validation
      if (
        urlObj.hostname === 'localhost' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)
      ) {
        return true;
      }

      // For regular domains, must have at least one dot and valid TLD
      const parts = urlObj.hostname.split('.');
      if (parts.length < 2) {
        return false;
      }

      // Last part (TLD) must be at least 2 characters
      const tld = parts[parts.length - 1];
      if (tld.length < 2) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  };

  const testBlockExplorerApi = async (
    apiUrl: string
  ): Promise<{ error?: string; success: boolean }> => {
    try {
      console.log('testBlockExplorerApi called with:', apiUrl);
      console.log('About to call controllerEmitter with path:', [
        'wallet',
        'testExplorerApi',
      ]);

      // Use the controller's testExplorerApi method
      const result = await controllerEmitter(
        ['wallet', 'testExplorerApi'],
        [apiUrl]
      );

      console.log('controllerEmitter result:', result);

      // The controller returns { success: boolean; error?: string }
      // Make sure we properly handle the response
      if (result && typeof result === 'object' && 'success' in result) {
        return result as { error?: string; success: boolean };
      }

      // Fallback for unexpected response format
      return { success: Boolean(result), error: 'Unexpected response format' };
    } catch (error) {
      console.log('API test failed:', error);
      return {
        success: false,
        error: error?.message || 'Unable to test API',
      };
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const validateApiUrlAndShowError = async (apiUrl?: string) => {
    if (!apiUrl || !apiUrl.trim()) {
      // Clear any existing API URL field errors
      form.setFields([
        {
          name: 'apiUrl',
          errors: [],
        },
      ]);
      return true; // Optional field
    }

    try {
      const result = await testBlockExplorerApi(apiUrl.trim());
      if (!result.success) {
        // Improve error message handling
        let errorMessage = result.error || t('settings.apiFormatError');

        // Check if error is a translation key (starts with 'settings.')
        if (result.error?.startsWith('settings.')) {
          errorMessage = t(result.error);
        } else if (result.error) {
          // Handle specific error types
          if (
            result.error.includes('SyntaxError') ||
            result.error.includes('Unexpected token')
          ) {
            errorMessage =
              'API returned HTML instead of JSON - likely a 404 or server error';
          } else if (result.error.includes('404')) {
            errorMessage = 'API endpoint not found (404)';
          } else if (result.error.includes('403')) {
            errorMessage = 'Access forbidden (403) - check API key';
          } else if (result.error.includes('500')) {
            errorMessage = 'Server error (500)';
          } else if (result.error.includes('timeout')) {
            errorMessage = 'Request timeout - API may be slow or unreachable';
          }
        }

        // Set the form field to error state
        form.setFields([
          {
            name: 'apiUrl',
            errors: [errorMessage],
          },
        ]);

        alert.removeAll();
        alert.error(errorMessage);
        return false;
      }

      // Clear any existing errors and set to success state
      form.setFields([
        {
          name: 'apiUrl',
          errors: [],
        },
      ]);

      return true;
    } catch (error) {
      // Handle different types of errors
      let errorMessage = t('settings.apiConnectionError');

      if (error && typeof error === 'object' && 'message' in error) {
        const msg = (error as Error).message;
        if (msg.includes('SyntaxError') || msg.includes('Unexpected token')) {
          errorMessage =
            'API returned HTML instead of JSON - likely a 404 or server error';
        } else if (msg.includes('NetworkError') || msg.includes('fetch')) {
          errorMessage = 'Network error - unable to reach API';
        } else if (msg.includes('timeout')) {
          errorMessage = 'Request timeout - API may be slow or unreachable';
        } else {
          errorMessage = `API error: ${msg}`;
        }
      }

      // Set the form field to error state
      form.setFields([
        {
          name: 'apiUrl',
          errors: [errorMessage],
        },
      ]);

      alert.removeAll();
      alert.error(errorMessage);
      return false;
    }
  };

  const validateRpcUrlAndShowError = async (rpcUrl?: string) => {
    if (!rpcUrl || !rpcUrl.trim()) {
      // Clear any existing RPC URL field errors
      form.setFields([
        {
          name: 'url',
          errors: [],
        },
      ]);
      return true; // Required field validation will handle empty case
    }

    try {
      if (isSyscoinRpc) {
        const trezorIoRegExp = /trezor\.io/;
        if (trezorIoRegExp.test(rpcUrl)) {
          throw new Error(t('settings.trezorSiteWarning'));
        }

        // UTXO RPC validation - this will throw an error with specific message if validation fails
        const { valid } = await validateSysRpc(rpcUrl);

        if (!valid) {
          throw new Error(t('settings.invalidUtxoRpcUrl'));
        }

        // If we get here, validation passed
        return true;
      } else {
        // EVM RPC validation - this will throw an error with specific message if validation fails
        const { valid, details, hexChainId } = await validateEthRpc(
          rpcUrl,
          false
        );

        if (!valid) {
          throw new Error(t('settings.invalidEthRpcUrl'));
        }

        // In edit mode, verify chainId matches
        if (state?.selected) {
          const stateChainId = state.selected.chainId;
          const rpcChainId =
            details?.chainId || Number(String(parseInt(hexChainId, 16)));

          if (stateChainId !== rpcChainId) {
            throw new Error(t('settings.networkMismatch'));
          }
        }

        // If we get here, validation passed
        return true;
      }
    } catch (error) {
      // Extract the actual error message from the thrown error
      let errorMessage = t('settings.failedValidateRpc');
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as Error).message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      form.setFields([
        {
          name: 'url',
          errors: [errorMessage],
        },
      ]);

      alert.removeAll();
      alert.error(errorMessage);
      return false;
    }
  };

  const onSubmit = async (data: ICustomRpcParams) => {
    setLoading(true);

    // Validate form fields before proceeding
    try {
      await form.validateFields();
    } catch (error) {
      console.log('Form validation failed:', error);
      setLoading(false);

      // Get specific field errors to show user
      const fieldErrors = form.getFieldsError();
      const errorFields = fieldErrors.filter(
        (field) => field.errors.length > 0
      );

      let errorMessage = t('settings.fixValidationErrors');
      if (errorFields.length > 0) {
        const firstError = errorFields[0];
        errorMessage = `${firstError.name[0]}: ${firstError.errors[0]}`;
      }

      alert.removeAll();
      alert.error(errorMessage);
      return;
    }

    // Validate RPC URL and show toast error if invalid
    if (!(await validateRpcUrlAndShowError(data.url))) {
      setLoading(false);
      return;
    }

    // Validate API URL and show toast error if invalid
    if (data.apiUrl && !(await validateApiUrlAndShowError(data.apiUrl))) {
      setLoading(false);
      return;
    }

    const customRpc = {
      ...data,
      isSyscoinRpc,
    };

    try {
      if (!state) {
        // Adding new network - save and show success modal
        await controllerEmitter(['wallet', 'addCustomRpc'], [customRpc]);
        setLoading(false);
        setAddedRpc(true);
        return;
      }

      // Editing existing network - save and show success feedback
      await controllerEmitter(
        ['wallet', 'editCustomRpc'],
        [customRpc, state.selected]
      );
      setLoading(false);

      // Show success notification
      alert.removeAll();
      alert.success(modalMessageOnSuccessful);

      // Navigate back after a brief delay to let user see the success message
      setTimeout(() => navigate(-1), 1500);
    } catch (error: any) {
      alert.removeAll();
      setAddedRpc(false);
      setShowModal(true);
      setLoading(false);
      setErrorModalMessage(error.message);
    }
  };

  // Get fresh network data from Redux store instead of stale route state
  const getCurrentNetworkData = () => {
    if (!state?.selected || !state?.isEditing) return null;

    const chain = isSyscoinRpc ? 'syscoin' : 'ethereum';
    const networkKey = state.selected.key || state.selected.chainId;

    // Use fresh data from Redux store
    return networks[chain][networkKey] || state.selected;
  };

  const currentNetwork = getCurrentNetworkData();

  const initialValues = {
    label: currentNetwork?.label ?? '',
    url: currentNetwork?.url ?? '',
    chainId: currentNetwork?.chainId ?? '',
    symbol: currentNetwork?.currency?.toUpperCase() ?? '',
    explorer: currentNetwork?.explorer ?? '',
    apiUrl: currentNetwork?.apiUrl ?? '',
  };

  const isInputDisableByEditMode = state ? state.isDefault : false;

  // Load and cache chain data once on component mount
  useEffect(() => {
    // Multi-level caching strategy:
    // 1. ChainListService singleton (initialized by MainController on startup)
    //    - Browser storage cache (24h persistence)
    //    - In-memory cache with request deduplication
    //    - Background fetching for stale cache
    // 2. Component-level caching (this state)
    //    - Eliminates async call overhead during search
    //    - Pure JavaScript filtering for instant results
    const loadChainData = async () => {
      try {
        const chainListService = ChainListService.getInstance();
        // Since MainController already initializes this service, the data should be readily available
        const chains = await chainListService.getChainData();
        setAllChains(chains);
        console.log(
          `[CustomRPC] Loaded ${chains.length} chains from ChainListService`
        );
      } catch (error) {
        console.error('[CustomRPC] Failed to load chain data:', error);
        // Still allow the component to work even if chain data fails
        setAllChains([]);
      }
    };

    loadChainData();
  }, []);

  // Update form when Redux state changes (after editing)
  useEffect(() => {
    if (currentNetwork && state?.isEditing) {
      form.setFieldsValue({
        label: currentNetwork.label,
        url: currentNetwork.url,
        chainId: currentNetwork.chainId,
        symbol: currentNetwork.currency.toUpperCase(),
        explorer: currentNetwork.explorer,
        apiUrl: currentNetwork.apiUrl,
      });
    }
  }, [currentNetwork, form, state?.isEditing]);

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setNetworkSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Smart network search with auto-completion - now uses cached data
  const searchNetworks = debounce(async (query: string) => {
    if (!query || !query.trim() || isSyscoinRpc) {
      setNetworkSuggestions([]);
      return;
    }

    // Don't search if query is too short
    if (query.trim().length < 2) {
      setNetworkSuggestions([]);
      return;
    }

    // Early return if no chains loaded yet
    if (allChains.length === 0) {
      setNetworkLoading(true);
      return;
    }

    setNetworkLoading(true);

    try {
      const lowerQuery = query.toLowerCase().trim();
      const results: (ChainInfo & { score?: number })[] = [];

      allChains.forEach((chain) => {
        let score = 0;
        const name = chain.name.toLowerCase();
        const symbol = chain.nativeCurrency.symbol.toLowerCase();
        const chainId = chain.chainId.toString();

        // Scoring for relevance
        if (name === lowerQuery) score += 100;
        else if (name.startsWith(lowerQuery)) score += 50;
        else if (name.includes(lowerQuery)) score += 25;

        if (symbol === lowerQuery) score += 80;
        else if (symbol.startsWith(lowerQuery)) score += 40;

        if (chainId === lowerQuery) score += 90;
        else if (chainId.startsWith(lowerQuery)) score += 45;

        if (score > 0 && chain.rpc && chain.rpc.length > 0) {
          results.push({ ...chain, score });
        }
      });

      // Sort by score and take top 6 for better UI
      const sortedResults = results
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 6);

      setNetworkSuggestions(sortedResults);
    } catch (error) {
      console.error('Network search failed:', error);
      setNetworkSuggestions([]);
    } finally {
      setNetworkLoading(false);
    }
  }, 10);

  // Handle network selection from autocomplete
  const handleNetworkSelect = async (value: string, option: any) => {
    const selectedChain = option.chain;
    if (!selectedChain) return;

    // Clear suggestions immediately to close dropdown
    setNetworkSuggestions([]);

    // Fill form fields immediately for instant UX with uppercase symbol
    form.setFieldsValue({
      label: selectedChain.name,
      chainId: selectedChain.chainId.toString(),
      symbol: selectedChain.nativeCurrency.symbol.toUpperCase(),
      explorer:
        selectedChain.explorers && selectedChain.explorers.length > 0
          ? selectedChain.explorers[0].url
          : '',
    });

    // Reset URL field before testing
    form.setFieldsValue({ url: '' });

    setCurrentRpcTest({
      index: 0,
      total: 0,
      url: '',
    });

    // Try RPCs in order until we find one that works
    await tryBestWorkingRpc(selectedChain);
  };

  // Try multiple RPCs until we find one that works
  const tryBestWorkingRpc = async (chain: ChainInfo) => {
    if (!chain.rpc || chain.rpc.length === 0) return;

    setTestingRpcs(true);

    // Order RPCs by preference: no tracking + open source > no tracking > open source > others
    const orderedRpcs = [...chain.rpc].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (a.tracking === 'none' && a.isOpenSource) scoreA += 100;
      else if (a.tracking === 'none') scoreA += 50;
      else if (a.isOpenSource) scoreA += 25;

      if (b.tracking === 'none' && b.isOpenSource) scoreB += 100;
      else if (b.tracking === 'none') scoreB += 50;
      else if (b.isOpenSource) scoreB += 25;

      return scoreB - scoreA;
    });

    // Try each RPC until we find one that works
    for (let i = 0; i < orderedRpcs.length; i++) {
      const rpc = orderedRpcs[i];

      // Update progress
      setCurrentRpcTest({
        index: i + 1,
        total: orderedRpcs.length,
        url: rpc.url,
      });

      try {
        // Set this RPC in the form
        form.setFieldsValue({ url: rpc.url });

        // Add a small delay for UX
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Validate the RPC with timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), 5000)
        );

        const validationPromise = validateEthRpc(rpc.url, false);
        const { valid } = (await Promise.race([
          validationPromise,
          timeoutPromise,
        ])) as any;

        if (valid) {
          // Found a working RPC, set it and break
          setTestingRpcs(false);
          setCurrentRpcTest(null);

          // Clear any existing toasts first to prevent conflicts
          alert.removeAll();

          // Create stable success message
          const hostname = rpc.url ? new URL(rpc.url).hostname : 'RPC server';
          const successMessage = `Connected to ${chain.name} via ${hostname}`;

          // Success feedback with stable message
          alert.success(successMessage);

          return;
        }
      } catch (error) {
        // This RPC failed, continue to next one
        console.log(`RPC ${rpc.url} failed:`, error);
        continue;
      }
    }

    // If we get here, no RPC worked
    setTestingRpcs(false);
    setCurrentRpcTest(null);
    alert.error(
      `Unable to connect to ${chain.name}. Please try a custom RPC URL.`
    );
  };

  // Custom icon component for autocomplete with proper caching
  const AutoCompleteIcon: React.FC<{ chain: ChainInfo; size?: number }> =
    React.memo(
      ({ chain, size = 24 }) => (
        <ChainIcon
          chainId={chain.chainId}
          size={size}
          networkKind="evm"
          iconName={chain.icon || chain.chainSlug}
          className="flex-shrink-0"
        />
      ),
      (prevProps, nextProps) =>
        prevProps.chain.chainId === nextProps.chain.chainId &&
        prevProps.size === nextProps.size
    );
  AutoCompleteIcon.displayName = 'AutoCompleteIcon';

  // Memoize the suggestion item to prevent unnecessary re-renders
  const NetworkSuggestionItem = React.memo<{
    chain: ChainInfo;
    onSelect: () => void;
  }>(
    ({ chain, onSelect }) => {
      // Check if network name is long and might be truncated - more aggressive threshold
      const isLongName = chain.name.length > 18;

      return (
        <div
          className="group relative flex items-center gap-2 py-2.5 px-4 hover:bg-gradient-to-r hover:from-brand-blue600 hover:to-brand-blue500 cursor-pointer transition-all duration-300 ease-in-out border-b border-dashed border-alpha-whiteAlpha300 last:border-b-0 hover:border-brand-royalblue hover:shadow-lg hover:shadow-brand-blue600/20 active:scale-[0.98] active:bg-brand-blue700"
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent blur from firing first
            onSelect();
          }}
        >
          {/* Background glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-blue600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>

          {/* Icon with enhanced hover styling */}
          <div className="relative flex-shrink-0 transform group-hover:scale-110 transition-transform duration-300 ease-out group-hover:brightness-125">
            <div className="relative group-hover:drop-shadow-lg">
              <AutoCompleteIcon chain={chain} size={24} />
              {/* More visible ring effect on hover */}
              <div className="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-brand-white/40 group-hover:ring-4 transition-all duration-300"></div>
            </div>
          </div>

          {/* Content with improved responsive layout */}
          <div className="flex-1 min-w-0 relative z-10">
            {/* Network name and chain ID - better spacing */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              {/* Network name with proper tooltip logic */}
              <Tooltip
                content={isLongName ? chain.name : null}
                childrenClassName="flex-1 min-w-0"
                placement="top"
              >
                <span className="font-medium text-brand-white group-hover:text-white group-hover:font-semibold truncate text-xs leading-tight text-left block w-full group-hover:drop-shadow-sm transition-all duration-300">
                  {chain.name}
                </span>
              </Tooltip>

              {/* Chain ID badge */}
              <span className="text-xs px-2 py-0.5 text-white bg-brand-royalblue rounded-full font-medium shadow-sm group-hover:shadow-md group-hover:bg-brand-blue500 transform group-hover:scale-105 transition-all duration-300 flex-shrink-0">
                {chain.chainId}
              </span>
            </div>

            {/* Currency and RPC info - more compact */}
            <div className="flex items-center justify-start gap-1.5 text-xs text-brand-gray200 group-hover:text-brand-white/90 transition-colors duration-300">
              <span className="inline-flex items-center gap-1 font-medium text-left">
                <span className="text-brand-royalblue group-hover:text-white font-semibold text-xs">
                  ${chain.nativeCurrency.symbol.toUpperCase()}
                </span>
                <span className="text-brand-gray200 group-hover:text-brand-white/50 text-xs">
                  •
                </span>
                <span className="font-mono text-xs text-brand-gray300 group-hover:text-brand-white/80">
                  {chain.rpc?.length || 0} RPC
                  {(chain.rpc?.length || 0) !== 1 ? 's' : ''}
                </span>
              </span>
            </div>
          </div>

          {/* Enhanced arrow indicator */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all duration-300 ease-out">
            <div className="w-2 h-2 border-r-2 border-t-2 border-brand-white/80 group-hover:border-white rotate-45 group-hover:drop-shadow-sm"></div>
          </div>
        </div>
      );
    },
    (prevProps, nextProps) =>
      prevProps.chain.chainId === nextProps.chain.chainId
  );
  NetworkSuggestionItem.displayName = 'NetworkSuggestionItem';

  return (
    <Layout
      title={
        state?.isEditing ? `${t('buttons.edit')} RPC` : t('settings.customRpc')
      }
    >
      <RPCSuccessfullyAdded
        show={addedRpc}
        title={t('titles.congratulations')}
        phraseOne={modalMessageOnSuccessful}
        onClose={() => navigate('/settings/networks/edit')}
      />
      <StatusModal
        status="error"
        title={t('buttons.error')}
        description={errorModalMessage}
        onClose={closeModal}
        show={showModal}
      />

      {/* RPC Testing Progress Indicator */}
      {testingRpcs && currentRpcTest && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Testing RPC {currentRpcTest.index} of {currentRpcTest.total}
              </p>
              <p className="text-xs text-blue-700 truncate">
                {new URL(currentRpcTest.url).hostname}
              </p>
            </div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (currentRpcTest.index / currentRpcTest.total) * 100
                }%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {state?.isEditing && currentNetwork && (
        <div className="mb-6">
          {/* Beautiful display for edit mode with animations - using fresh Redux data */}
          <div className="group custom-input-normal relative flex items-center gap-3 py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:border-blue-300">
            <div className="relative">
              <ChainIcon
                chainId={currentNetwork.chainId || 0}
                size={32}
                networkKind={
                  currentNetwork.kind ||
                  (isSyscoinRpc ? INetworkType.Syscoin : INetworkType.Ethereum)
                }
                className="flex-shrink-0 ring-2 ring-white shadow-md rounded-full transform group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse ring-2 ring-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 truncate text-xl group-hover:text-blue-600 transition-colors duration-200">
                  {currentNetwork.label || 'Unknown Network'}
                </span>
                <span className="text-xs px-2 py-0.5 text-white bg-brand-royalblue rounded-full font-medium shadow-sm group-hover:shadow-md group-hover:bg-brand-blue500 transform group-hover:scale-105 transition-all duration-300 flex-shrink-0">
                  {currentNetwork.kind === INetworkType.Syscoin || isSyscoinRpc
                    ? currentNetwork.slip44 || currentNetwork.chainId
                    : currentNetwork.chainId}
                </span>
              </div>
              <div className="text-sm text-gray-700 mt-1 font-medium group-hover:text-gray-900 transition-colors duration-200">
                ${currentNetwork.currency.toUpperCase()} •{' '}
                {currentNetwork.kind === INetworkType.Syscoin || isSyscoinRpc
                  ? 'UTXO Network'
                  : 'EVM Network'}
              </div>
            </div>
          </div>
        </div>
      )}

      <Form
        form={form}
        key="custom-rpc-form"
        id="rpc"
        name="rpc"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 8 }}
        initialValues={initialValues}
        onFinish={onSubmit}
        autoComplete="off"
        className="flex flex-col gap-3 items-center justify-center text-center"
      >
        {!state?.isEditing && (
          <>
            <Form.Item
              id="network-switch"
              name="network-switch"
              rules={[
                {
                  required: false,
                  message: '',
                },
              ]}
            >
              <div className="flex gap-x-2 mb-4 text-xs">
                <p className="text-brand-blue200 text-xs">EVM</p>
                <Tooltip
                  content={
                    state?.isEditing
                      ? 'Cannot change network type while editing'
                      : ''
                  }
                >
                  <Switch
                    checked={isSyscoinRpc}
                    onChange={(checked) => setIsSyscoinRpc(checked)}
                    className="relative inline-flex items-center w-9 h-4 border border-white rounded-full"
                    disabled={state?.isEditing}
                  >
                    <span className="sr-only">Syscoin Network</span>
                    <span
                      className={`${switchBallStyle} inline-block w-2 h-2 transform rounded-full`}
                    />
                  </Switch>
                </Tooltip>

                <p className="text-brand-deepPink100 text-xs">UTXO</p>
              </div>
            </Form.Item>
            <Form.Item
              name="label"
              className="md:w-full"
              hasFeedback
              rules={[
                {
                  required: !isSyscoinRpc,
                  message: '',
                },
              ]}
            >
              {/* Always render both inputs, hide with CSS to prevent hook order changes */}
              <div className={!isSyscoinRpc ? 'block' : 'hidden'}>
                {/* Autocomplete input for adding mode */}
                <div className="relative w-full" ref={dropdownRef}>
                  <Input
                    type="text"
                    disabled={isInputDisableByEditMode}
                    placeholder={`${t(
                      'settings.label'
                    )} - Start typing to search networks`}
                    className="custom-input-normal relative"
                    onChange={(e) => {
                      const value = e.target.value;
                      form.setFieldsValue({ label: value });
                      searchNetworks(value);
                    }}
                    value={form.getFieldValue('label')}
                  />
                  <div
                    className={`absolute top-full left-0 right-0 z-50 mt-2 bg-brand-blue600 border border-brand-royalblue/30 rounded-xl shadow-2xl shadow-brand-blue600/40 max-h-80 overflow-hidden transition-all duration-300 ease-out backdrop-blur-sm ${
                      networkSuggestions.length > 0 && !testingRpcs
                        ? 'opacity-100 visible transform scale-100'
                        : 'opacity-0 invisible pointer-events-none transform scale-95'
                    }`}
                    style={{
                      background:
                        'linear-gradient(145deg, #1E365C 0%, #162742 100%)',
                      boxShadow:
                        '0 20px 25px -5px rgba(30, 54, 92, 0.4), 0 10px 10px -5px rgba(30, 54, 92, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Subtle top border accent */}
                    <div className="h-px bg-gradient-to-r from-transparent via-brand-royalblue to-transparent"></div>

                    <div className="overflow-y-auto max-h-80 scrollbar-styled">
                      {networkLoading ? (
                        <div className="p-6 text-center">
                          <div className="inline-flex items-center gap-3 text-brand-white/80">
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-royalblue border-t-transparent"></div>
                            <span className="font-medium">
                              Searching networks...
                            </span>
                          </div>
                        </div>
                      ) : (
                        networkSuggestions.map((chain) => (
                          <NetworkSuggestionItem
                            key={`network-${chain.chainId}`}
                            chain={chain}
                            onSelect={() => {
                              setNetworkSuggestions([]); // Close immediately
                              handleNetworkSelect(chain.name, { chain });
                            }}
                          />
                        ))
                      )}
                    </div>

                    {/* Subtle bottom border accent */}
                    <div className="h-px bg-gradient-to-r from-transparent via-brand-royalblue/50 to-transparent"></div>
                  </div>
                </div>
              </div>

              <div className={isSyscoinRpc ? 'block' : 'hidden'}>
                <Input
                  type="text"
                  disabled={isInputDisableByEditMode}
                  placeholder={`${t('settings.label')}`}
                  className="custom-input-normal relative"
                />
              </div>
            </Form.Item>
          </>
        )}

        {/* Hidden label field for editing mode - needed for form data but not displayed */}
        {state?.isEditing && (
          <Form.Item name="label" style={{ display: 'none' }}>
            <Input type="hidden" />
          </Form.Item>
        )}
        <Form.Item
          name="url"
          className="md:w-full"
          hasFeedback
          rules={[
            {
              required: true,
              message: t('settings.rpcUrlRequired'),
            },
            () => ({
              validator(_, value) {
                if (!value || value.trim() === '') {
                  return Promise.resolve();
                }
                // Basic URL format validation only
                if (validateUrl(value.trim())) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(t('settings.validUrlRequired'))
                );
              },
            }),
          ]}
        >
          <Input
            ref={urlInputRef}
            type="text"
            placeholder={`${isSyscoinRpc ? 'Explorer' : 'RPC URL'}`}
            className="custom-input-normal relative"
          />
        </Form.Item>

        <Form.Item
          name="chainId"
          hasFeedback
          className="md:w-full"
          rules={[
            {
              required: false,
              message: t('settings.chainIdRequired'),
            },
          ]}
        >
          <Input
            type="text"
            disabled={true}
            placeholder="Chain ID (auto-filled from RPC)"
            className={`${inputHiddenOrNotStyle} custom-input-normal `}
          />
        </Form.Item>
        <Form.Item
          name="symbol"
          hasFeedback
          className="md:w-full"
          rules={[
            {
              required: !isSyscoinRpc,
              message: t('settings.symbolRequired'),
            },
          ]}
        >
          <Input
            type="text"
            placeholder={t('settings.symbol')}
            className={`${inputHiddenOrNotStyle} custom-input-normal relative uppercase`}
            onChange={(e) => {
              const upperValue = e.target.value.toUpperCase();
              form.setFieldsValue({ symbol: upperValue });
            }}
          />
        </Form.Item>
        <Form.Item
          hasFeedback
          className="md:w-full"
          name="explorer"
          rules={[
            {
              required: false,
              message: 'Explorer URL is required',
            },
            () => ({
              validator(_, value) {
                if (!value || value.trim() === '') {
                  return Promise.resolve();
                }
                if (validateUrl(value.trim())) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(t('settings.validUrlRequired'))
                );
              },
            }),
          ]}
        >
          <Input
            type="text"
            placeholder={t('settings.explorer')}
            className={`${inputHiddenOrNotStyle} custom-input-normal `}
          />
        </Form.Item>
        <div className="md:w-full">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm text-white font-medium">
              Block Explorer API URL (optional)
            </label>
            <Tooltip
              content="Include your API key in the URL if needed (e.g., https://api.etherscan.io/api?apikey=YOUR_KEY). This enables enhanced transaction details and history."
              placement="top"
            >
              <Icon
                name="Info"
                isSvg
                size={14}
                className="text-brand-gray200 hover:text-white cursor-pointer"
              />
            </Tooltip>
          </div>
          <Form.Item
            hasFeedback
            className="md:w-full mb-0"
            name="apiUrl"
            rules={[
              {
                required: false,
                message: '',
              },
              () => ({
                validator(_, value) {
                  if (!value || value.trim() === '') {
                    return Promise.resolve();
                  }
                  // Only validate URL format, not API functionality
                  if (validateUrl(value.trim())) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(t('settings.validUrlRequired'))
                  );
                },
              }),
            ]}
          >
            <Input
              type="text"
              placeholder="https://api.example.com/api"
              className="custom-input-normal relative"
            />
          </Form.Item>
        </div>
        <div className="absolute bottom-10 left-0 right-0 px-4 md:static md:px-0">
          {state?.isEditing ? (
            <div className="flex gap-6 justify-center">
              <Button
                type="button"
                className="bg-transparent rounded-[100px] w-[10.25rem] h-[40px] text-white text-base font-medium border border-white"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="bg-white rounded-[100px] w-[10.25rem] h-[40px] text-brand-blue400 text-base font-medium"
              >
                Save
              </Button>
            </div>
          ) : (
            <Button
              className="xl:p-18 h-[40px] w-[352px] flex items-center justify-center text-brand-blue400 text-base bg-white hover:opacity-60 rounded-[100px] transition-all duration-300 xl:flex-none"
              type="submit"
              loading={loading}
            >
              {t('buttons.save')}
            </Button>
          )}
        </div>
      </Form>
    </Layout>
  );
};

export default CustomRPCView;
