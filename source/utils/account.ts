import {
  IVaultState,
  IOmittedVault,
  IOmmitedAccount,
  IPaliAccount,
} from 'state/vault/types';

export const removeXprv = (account: IPaliAccount): IOmmitedAccount => {
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
  const { xprv, ...remainingInfo } = account;

  return remainingInfo;
};

export const removeSensitiveDataFromVault = (
  vault: IVaultState
): IOmittedVault => {
  const accounts = {};

  for (const account of Object.values(vault.accounts.HDAccount)) {
    accounts[account.id] = removeXprv(account);
  }
  for (const account of Object.values(vault.accounts.Imported)) {
    accounts[account.id] = removeXprv(account);
  }

  return {
    ...vault,
    accounts,
  };
};
