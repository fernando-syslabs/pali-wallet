import { Form, Input } from 'antd';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Layout, Card, CopyCard, NeutralButton } from 'components/index';
import { useUtils } from 'hooks/index';
import { getController } from 'scripts/Background';

const PhraseView = () => {
  const [phrase, setPhrase] = useState<string>(
    '**** ******* ****** ****** ****** ******** *** ***** ****** ***** *****'
  );
  const { t } = useTranslation();
  const { useCopyClipboard, navigate, alert } = useUtils();
  const controller = getController();
  const [copied, copyText] = useCopyClipboard();

  const handleCopySeed = () => {
    copyText(phrase);
  };

  useEffect(() => {
    if (!copied) return;

    alert.removeAll();
    alert.success(t('settings.seedPhraseCopied'));
  }, [copied]);

  return (
    <Layout title={t('settings.walletSeedPhrase')} id="seed-phrase-title">
      <div className="flex flex-col items-center justify-center md:w-full md:max-w-md">
        <Form
          validateMessages={{ default: '' }}
          className="password flex flex-col gap-8 items-center justify-center mb-4 w-full max-w-xs text-center md:max-w-md"
          name="phraseview"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          autoComplete="off"
        >
          <Form.Item
            name="password"
            hasFeedback
            className="w-full md:max-w-md"
            rules={[
              {
                required: true,
                message: '',
              },
              () => ({
                async validator(_, value) {
                  try {
                    const seed = await controller.wallet.getSeed(value);
                    if (seed) {
                      setPhrase(seed);

                      return Promise.resolve();
                    }
                  } catch (e) {
                    console.log('Error: ', e);
                  }

                  return Promise.reject();
                },
              }),
            ]}
          >
            <Input.Password
              className="input-small relative"
              placeholder={t('settings.enterYourPassword')}
              id="phraseview_password"
            />
          </Form.Item>
        </Form>

        <CopyCard
          className="my-4"
          onClick={() =>
            phrase !==
              '**** ******* ****** ****** ****** ******** *** ***** ****** ***** *****' &&
            handleCopySeed()
          }
          label={t('settings.seedPhraseClickTo')}
        >
          <p className="mt-3 text-xs" id="user-phrase">
            {phrase}
          </p>
        </CopyCard>

        <Card type="info">
          <p>
            <b className="text-warning-info">{t('settings.forgetWarning')}:</b>{' '}
            {t('settings.keepYourSeed')}
          </p>
        </Card>

        <div className="absolute bottom-12 md:static md:mt-10">
          <NeutralButton type="button" onClick={() => navigate('/home')}>
            {t('buttons.close')}
          </NeutralButton>
        </div>
      </div>
    </Layout>
  );
};

export default PhraseView;
