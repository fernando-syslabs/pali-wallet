import React, { memo, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import { Tooltip } from 'components/Tooltip';
import { RootState } from 'state/store';

interface IConnectionStatusIndicatorProps {
  className?: string;
}

export const ConnectionStatusIndicator = memo(
  ({ className = '' }: IConnectionStatusIndicatorProps) => {
    const { t } = useTranslation();
    const [showSlowWarning, setShowSlowWarning] = useState(false);
    const [showCriticalError, setShowCriticalError] = useState(false);
    const [showSuccessConfirmation, setShowSuccessConfirmation] =
      useState(false);
    const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const criticalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousNetworkActivityRef = useRef<boolean>(false);

    // Get all network-related loading states from vaultGlobal
    const {
      networkStatus,
      changingConnectedAccount: { isChangingConnectedAccount },
      loadingStates: {
        isLoadingTxs,
        isLoadingBalances,
        isLoadingAssets,
        isLoadingNfts,
      },
    } = useSelector((state: RootState) => state.vaultGlobal);
    const networkTarget = useSelector(
      (state: RootState) => state.vaultGlobal.networkTarget
    );
    const activeNetwork = useSelector(
      (state: RootState) => state.vault.activeNetwork
    );

    // Comprehensive network activity check (same logic as isPollingRunNotValid)
    const isNetworkActivity =
      networkStatus === 'switching' ||
      networkStatus === 'connecting' ||
      isLoadingTxs ||
      isLoadingBalances ||
      isLoadingAssets ||
      isLoadingNfts ||
      isChangingConnectedAccount;

    // Track successful network operation completion
    useEffect(() => {
      // If we had network activity and now we don't (successful completion)
      if (
        previousNetworkActivityRef.current &&
        !isNetworkActivity &&
        networkStatus !== 'error'
      ) {
        // Show green confirmation briefly
        setShowSuccessConfirmation(true);

        // Hide after 2 seconds
        successTimeoutRef.current = setTimeout(() => {
          setShowSuccessConfirmation(false);
        }, 2000);
      }

      // Update previous activity state for next comparison
      previousNetworkActivityRef.current = isNetworkActivity;

      return () => {
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
          successTimeoutRef.current = null;
        }
      };
    }, [isNetworkActivity, networkStatus]);

    // Handle timing states for visual indicators during network activity
    useEffect(() => {
      // Clear existing timeouts
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      if (criticalTimeoutRef.current) {
        clearTimeout(criticalTimeoutRef.current);
        criticalTimeoutRef.current = null;
      }

      if (isNetworkActivity) {
        // Show slow warning after 5 seconds
        warningTimeoutRef.current = setTimeout(() => {
          setShowSlowWarning(true);
        }, 5000);

        // Show critical error after 9 seconds (1 second before main timeout)
        criticalTimeoutRef.current = setTimeout(() => {
          setShowCriticalError(true);
        }, 9000);
      } else {
        // Reset states when no network activity
        setShowSlowWarning(false);
        setShowCriticalError(false);
      }

      return () => {
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
          warningTimeoutRef.current = null;
        }
        if (criticalTimeoutRef.current) {
          clearTimeout(criticalTimeoutRef.current);
          criticalTimeoutRef.current = null;
        }
      };
    }, [isNetworkActivity]);

    // Handle click - only for error state to go to error page
    const handleClick = () => {
      if (networkStatus === 'error') {
        window.location.hash = '/chain-fail-to-connect';
      }
    };

    // Determine if indicator should be visible
    const shouldShowIndicator =
      isNetworkActivity || showSuccessConfirmation || networkStatus === 'error';

    // Determine status color and message based on state
    let statusColor = 'bg-brand-blue500'; // Default: network activity (blue)
    let pulseClass = 'animate-pulse';
    let tooltipContent = t(
      'networkConnection.operationInProgress',
      'Network operation in progress...'
    );
    let isClickable = false;

    if (networkStatus === 'error') {
      // Red: Network error - click to go to error page
      statusColor = 'bg-red-600';
      pulseClass = ''; // No pulsing for error state
      tooltipContent = t(
        'networkConnection.networkError',
        'Network error - click for options'
      );
      isClickable = true;
    } else if (showSuccessConfirmation) {
      // Green: Successfully completed
      statusColor = 'bg-green-500';
      pulseClass = 'animate-pulse';
      tooltipContent = t('networkConnection.operationCompleted');
    } else if (showCriticalError) {
      // Red: Operation failing/about to timeout
      statusColor = 'bg-red-600';
      pulseClass = 'animate-pulse-fast'; // Faster pulsing for urgency
      tooltipContent = t(
        'networkConnection.operationFailing',
        'Network operation taking too long'
      );
    } else if (showSlowWarning) {
      // Orange: Operation is slow
      statusColor = 'bg-orange-500';
      tooltipContent = t(
        'networkConnection.operationSlow',
        '{{operation}} - slower than expected',
        {
          operation: tooltipContent.replace('...', ''),
        }
      );
    } else if (isNetworkActivity) {
      // More specific titles based on what's loading
      if (networkStatus === 'switching') {
        tooltipContent = t(
          'networkConnection.switchingNetwork',
          'Switching network...'
        );
      } else if (networkStatus === 'connecting') {
        const targetNetworkName =
          networkTarget?.label || activeNetwork?.label || 'network';
        tooltipContent = t(
          'networkConnection.connecting',
          'Connecting to {{network}}',
          { network: targetNetworkName }
        );
      } else if (isLoadingBalances) {
        tooltipContent = t(
          'networkConnection.updatingBalances',
          'Updating balances...'
        );
      } else if (isLoadingAssets) {
        tooltipContent = t(
          'networkConnection.loadingAssets',
          'Loading assets...'
        );
      } else if (isLoadingTxs) {
        tooltipContent = t(
          'networkConnection.loadingTransactions',
          'Loading transactions...'
        );
      } else if (isLoadingNfts) {
        tooltipContent = t('networkConnection.loadingNfts', 'Loading NFTs...');
      } else if (isChangingConnectedAccount) {
        tooltipContent = t(
          'networkConnection.switchingAccount',
          'Switching account...'
        );
      }
    }

    // Always render container with fixed dimensions to prevent layout shifts
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width: '8px', height: '8px' }}
      >
        <Tooltip
          content={shouldShowIndicator ? tooltipContent : null}
          placement="bottom"
          childrenClassName="flex items-center justify-center"
        >
          <div
            className={`w-2 h-2 rounded-full shadow-sm border transition-opacity duration-200 flex-shrink-0 ${
              shouldShowIndicator
                ? `${statusColor} ${pulseClass} border-white/20 opacity-100`
                : 'bg-transparent border-transparent opacity-0'
            } ${
              isClickable
                ? 'cursor-pointer hover:scale-110 transition-transform'
                : ''
            }`}
            onClick={isClickable ? handleClick : undefined}
          />
        </Tooltip>
      </div>
    );
  }
);

ConnectionStatusIndicator.displayName = 'ConnectionStatusIndicator';
