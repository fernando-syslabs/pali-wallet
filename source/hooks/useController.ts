import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

import { controllerEmitter } from 'scripts/Background/controllers/controllerEmitter';
import { RootState } from 'state/store';

export const useController = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Get hasEncryptedVault from global state to distinguish between locked and forgotten states
  const hasEncryptedVault = useSelector(
    (state: RootState) => state.vaultGlobal.hasEncryptedVault
  );

  // Function to check unlock status
  const checkUnlockStatus = async () => {
    try {
      const unlocked = await controllerEmitter(['wallet', 'isUnlocked'], []);
      const wasUnlocked = isUnlocked;
      const nowUnlocked = !!unlocked;

      setIsUnlocked(nowUnlocked);

      // If wallet was unlocked but now locked, redirect to unlock screen
      // BUT only if there's still an encrypted vault (not forgotten)
      if (wasUnlocked && !nowUnlocked && !isLoading && hasEncryptedVault) {
        console.log(
          '[useController] Wallet became locked, redirecting to unlock screen'
        );
        navigate('/', { replace: true });
      }

      // If there's no encrypted vault, don't force redirect - let routing logic handle it
      if (wasUnlocked && !nowUnlocked && !isLoading && !hasEncryptedVault) {
        console.log(
          '[useController] Wallet was forgotten, allowing routing logic to handle navigation'
        );
      }

      return nowUnlocked;
    } catch (error: any) {
      // Don't spam console with connection errors during service worker lifecycle
      if (
        !error.message?.includes('Could not establish connection') &&
        !error.message?.includes('Receiving end does not exist') &&
        !error.message?.includes('Service worker timeout')
      ) {
        console.error('[useController] Error checking unlock status:', error);
      }
      // If we can't check status due to service worker issues, maintain current state
      // This prevents flickering during service worker restarts
      return isUnlocked;
    }
  };

  // Reset auto-lock timer on user activity
  const resetAutoLockTimer = async () => {
    try {
      await controllerEmitter(['wallet', 'resetAutoLockTimer'], []);
    } catch (error: any) {
      // Don't spam console with connection errors during service worker lifecycle
      if (
        !error.message?.includes('Could not establish connection') &&
        !error.message?.includes('Receiving end does not exist') &&
        !error.message?.includes('Service worker timeout')
      ) {
        console.error(
          '[useController] Error resetting auto-lock timer:',
          error
        );
      }
      // Silently ignore service worker connection errors - timer will be reset on next successful call
    }
  };

  // Handle lock state change messages from background
  const handleLockStateMessage = (message: any) => {
    if (message.type === 'CONTROLLER_STATE_CHANGE') {
      // State changes are handled by Redux, but we might have missed a lock event
      // Double-check unlock status to be safe
      checkUnlockStatus();
    } else if (message.type === 'logout') {
      // Explicit logout message - only redirect if there's still an encrypted vault
      console.log('[useController] Logout message received');
      setIsUnlocked(false);
      if (hasEncryptedVault) {
        console.log(
          '[useController] Redirecting to unlock screen after logout'
        );
        navigate('/', { replace: true });
      } else {
        console.log(
          '[useController] No encrypted vault, letting routing logic handle navigation'
        );
      }
    } else if (message.type === 'wallet_forgotten') {
      // Wallet was explicitly forgotten - don't redirect, let routing logic handle it
      console.log(
        '[useController] Wallet forgotten message received, letting routing logic handle navigation'
      );
      setIsUnlocked(false);
    }
  };

  useEffect(() => {
    // Initial unlock status check
    checkUnlockStatus().then(() => {
      setIsLoading(false);
    });

    // Listen for Chrome runtime messages about state changes
    const messageListener = (message: any) => {
      handleLockStateMessage(message);
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Set up periodic polling as a fallback to catch missed lock events
    // Poll every 10 seconds when unlocked, more frequently when locked
    let pollInterval: NodeJS.Timeout | null = null;
    let lockedPollInterval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      // Clear any existing intervals
      if (pollInterval) clearInterval(pollInterval);
      if (lockedPollInterval) clearInterval(lockedPollInterval);

      pollInterval = setInterval(async () => {
        try {
          const currentlyUnlocked = await checkUnlockStatus();

          // If we're locked, check more frequently to detect unlock quickly
          if (!currentlyUnlocked) {
            clearInterval(pollInterval!);
            pollInterval = null;

            // Start faster polling when locked (every 2 seconds)
            lockedPollInterval = setInterval(async () => {
              try {
                const stillLocked = !(await checkUnlockStatus());
                if (!stillLocked) {
                  // When unlocked, switch back to normal polling
                  clearInterval(lockedPollInterval!);
                  lockedPollInterval = null;
                  startPolling();
                }
              } catch (error: any) {
                // Ignore connection errors during locked polling
              }
            }, 2000);
          }
        } catch (error: any) {
          // Only log non-connection errors
          if (
            !error.message?.includes('Could not establish connection') &&
            !error.message?.includes('Receiving end does not exist') &&
            !error.message?.includes('Service worker timeout') &&
            !error.message?.includes('Failed to connect to service worker')
          ) {
            console.error('[useController] Polling error:', error);
          }
        }
      }, 10000); // 10 seconds for normal polling

      return pollInterval;
    };

    // Only start polling after initial load completes
    if (!isLoading) {
      startPolling();
    }

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      if (pollInterval) clearInterval(pollInterval);
      if (lockedPollInterval) clearInterval(lockedPollInterval);
    };
  }, [navigate]); // Only depend on navigate - hasEncryptedVault is accessed directly in scope

  // Reset auto-lock timer on route changes (user navigation activity)
  useEffect(() => {
    // Reset auto-lock timer whenever user navigates to a new route
    resetAutoLockTimer();
  }, [location.pathname, location.search, location.hash]);

  // Handle wallet locked errors and redirect to unlock screen
  const handleWalletLockedError = (error: any): boolean => {
    const errorMessage = error?.message || String(error);

    const walletLockedPatterns = [
      /Target keyring.*locked/i,
      /Wallet must be unlocked/i,
      /Wallet is locked/i,
      /Please unlock the wallet first/i,
      /No unlocked keyring found/i,
    ];

    const isWalletLockedError = walletLockedPatterns.some((pattern) =>
      pattern.test(errorMessage)
    );

    if (isWalletLockedError && hasEncryptedVault) {
      console.log(
        '[useController] Wallet locked error detected, redirecting to unlock screen'
      );
      navigate('/', { replace: true });
      return true; // Error was handled
    }

    return false; // Error was not handled
  };

  return {
    controllerEmitter,
    isUnlocked,
    isLoading,
    handleWalletLockedError,
    resetAutoLockTimer,
  };
};
