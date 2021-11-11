import React from 'react';
// import { useAlert } from 'react-alert';
import { useHistory } from 'react-router-dom';
import Button from 'components/Button';
// import { useController } from 'hooks/index';
import ViewLayout from '../Layout';

const DeleteWalletView = () => {
  // const controller = useController();
  const history = useHistory();
  // const alert = useAlert();

  // const onSubmit = (data: any) => {
  //   if (controller.wallet.checkPassword(data.password)) {
  //     controller.wallet.deleteWallet(data.password);
  //     history.push('/app.html');

  //     return;
  //   }

  //   alert.removeAll();
  //   alert.error('Error: Invalid password');
  // };

  return (
    <ViewLayout title="DELETE WALLET">
      <div >
        <form>
          <span>
            <b>Warning:</b> this action will delete your wallet and all accounts
            associated with this wallet. Please make sure to back up your Wallet
            seed phase if you would like to access this wallet and associated
            accounts in the future.
          </span>
          <span>Please enter your wallet password:</span>
          <input type="text" />
          <div>
            <Button
              type="button"
              onClick={() => history.goBack()}
            >
              Close
            </Button>
            <Button
              type="submit"
            >
              Delete
            </Button>
          </div>
        </form>
      </div>
    </ViewLayout>
  );
};

export default DeleteWalletView;
