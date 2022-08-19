export interface IDApp {
  accountId: number;
  chain: string;
  chainId: number;
  host: string;
}

export interface IDAppState {
  /**
   * A list of sites that have been granted permissions to access a user's
   * account information.
   */
  dapps: {
    [host: string]: IDApp;
  };

  /**
   * Dapps that are currently listening for updates
   */
  listeners: {
    [host: string]: Array<string>;
  };
}
