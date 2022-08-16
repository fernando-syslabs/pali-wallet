import { Form, Input } from 'antd';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { Layout, SecondaryButton, DefaultModal } from 'components/index';
import { RootState } from 'state/store';
import { getController } from 'utils/browser';

const AutolockView = () => {
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const controller = getController();
  const navigate = useNavigate();

  const timer = useSelector((state: RootState) => state.vault.timer);

  const onSubmit = (data: any) => {
    setLoading(true);

    controller.wallet.setAutolockTimer(data.minutes);

    setConfirmed(true);
    setLoading(false);
  };

  return (
    <Layout
      title="AUTO LOCK TIMER"
      id="auto-lock-timer-title"
      titleOnly={false}
    >
      <p className="mx-auto py-6 max-w-xs text-white text-sm md:pb-10 md:max-w-md">
        You can set auto lock timer. Default is 5 minutes after no activity.
        Maximum is 30 minutes.
      </p>

      <DefaultModal
        show={confirmed}
        onClose={() => {
          setConfirmed(false);
          navigate('/home');
        }}
        title="Time set successfully"
        description="Your auto lock was configured successfully. You can change it at any time."
      />

      <Form
        validateMessages={{ default: '' }}
        className="standard flex flex-col gap-8 items-center justify-center text-center"
        name="autolock"
        id="autolock"
        onFinish={onSubmit}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        initialValues={{ minutes: timer }}
        autoComplete="off"
      >
        <Form.Item
          name="minutes"
          className="w-full"
          hasFeedback
          rules={[
            {
              required: true,
              message: '',
              min: 1,
              max: 30,
            },
            () => ({
              validator(_, value) {
                if (value <= 30 && value >= 1) {
                  return Promise.resolve();
                }

                return Promise.reject();
              },
            }),
          ]}
        >
          <Input type="number" placeholder="Minutes" className="small" />
        </Form.Item>

        <div className="absolute bottom-12 md:static">
          <SecondaryButton type="submit" loading={loading}>
            Save
          </SecondaryButton>
        </div>
      </Form>
    </Layout>
  );
};

export default AutolockView;
