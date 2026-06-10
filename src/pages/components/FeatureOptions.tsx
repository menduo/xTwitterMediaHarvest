/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ISettingsRepository } from '#domain/repositories/settings'
import { getText as i18n } from '#libs/i18n'
import useFeatureSettings from '#pages/hooks/useFeatureSettings'
import type { FeatureSettings } from '#schema'
import DownloadKey from '../../contentScript/KeyboardMonitor/DownloadKey'
import { RichFeatureSwitch } from './controls/featureControls'
import {
  FormControl,
  FormHelperText,
  FormLabel,
  Kbd,
  NumberInput,
  NumberInputField,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

const getKey = (downloadKey: DownloadKey): string => downloadKey.slice(-1)

const KeyboardShortcutDesc = () => {
  return (
    <Text as={'span'}>
      {i18n('Use keyboard shortcut to trigger download.', 'options:features')}
      <br />
      <Text as={'span'}>
        Twitter: <Kbd>{getKey(DownloadKey.Twitter)}</Kbd>
      </Text>
      <br />
      <Text as={'span'}>
        TweetDeck: <Kbd>{getKey(DownloadKey.BetaTweetDeck)}</Kbd>
      </Text>
    </Text>
  )
}

type FeatureOptionsProps = {
  featureSettingsRepo: ISettingsRepository<FeatureSettings>
}

const FeatureOptions = ({ featureSettingsRepo }: FeatureOptionsProps) => {
  const [featureSettings, toggler] = useFeatureSettings(featureSettingsRepo)
  const handleHoverDelayChange = (_valueAsString: string, value: number) => {
    if (!Number.isFinite(value)) return
    void toggler.hoverTriggerDownloadDelayMs(value)
  }
  const handleRedownloadDelayDaysChange = (
    _valueAsString: string,
    value: number
  ) => {
    if (!Number.isFinite(value)) return
    void toggler.redownloadExistingTweetDelayDays(value)
  }

  return (
    <VStack>
      <RichFeatureSwitch
        name={i18n('Auto-reveal sensitive content', 'options:features')}
        desc={i18n(
          'When the tweet was flagged as sensitive content, this feature can show the blured content automatically.',
          'options:features'
        )}
        isOn={featureSettings.autoRevealNsfw}
        handleClick={toggler.nsfw}
        testId="revealNsfw-feature-switch"
      />
      <RichFeatureSwitch
        name={i18n('Keyboard shortcut', 'options:features')}
        desc={<KeyboardShortcutDesc />}
        isOn={featureSettings.keyboardShortcut}
        handleClick={toggler.keyboardShortcut}
        testId="keyboardShortcut-feature-switch"
      />
      <RichFeatureSwitch
        name={i18n('Hover trigger download', 'options:features')}
        desc={i18n(
          'Trigger download after hovering over the Media Harvest button for a short moment.',
          'options:features'
        )}
        isOn={featureSettings.hoverTriggerDownload}
        handleClick={toggler.hoverTriggerDownload}
        testId="hoverTriggerDownload-feature-switch"
      />
      <FormControl data-testid="hoverTriggerDownloadDelayMs-setting">
        <FormLabel>{i18n('Hover trigger delay', 'options:features')}</FormLabel>
        <NumberInput
          value={featureSettings.hoverTriggerDownloadDelayMs}
          min={0}
          max={3000}
          step={50}
          isDisabled={!featureSettings.hoverTriggerDownload}
          onChange={handleHoverDelayChange}
        >
          <NumberInputField />
        </NumberInput>
        <FormHelperText>
          {i18n(
            'Milliseconds before hover starts a download.',
            'options:features'
          )}
        </FormHelperText>
      </FormControl>
      <RichFeatureSwitch
        name={i18n('Allow redownload existing tweets', 'options:features')}
        desc={i18n(
          'When enabled, manual hover downloads can run again for tweets already marked as downloaded after the configured age.',
          'options:features'
        )}
        isOn={featureSettings.allowRedownloadExistingTweet}
        handleClick={toggler.allowRedownloadExistingTweet}
        testId="allowRedownloadExistingTweet-feature-switch"
      />
      <FormControl data-testid="redownloadExistingTweetDelayDays-setting">
        <FormLabel>
          {i18n('Redownload existing tweets after', 'options:features')}
        </FormLabel>
        <NumberInput
          value={featureSettings.redownloadExistingTweetDelayDays}
          min={0}
          max={365}
          step={1}
          isDisabled={!featureSettings.allowRedownloadExistingTweet}
          onChange={handleRedownloadDelayDaysChange}
        >
          <NumberInputField />
        </NumberInput>
        <FormHelperText>
          {i18n(
            'Only redownload tweets downloaded at least this many days ago.',
            'options:features'
          )}
        </FormHelperText>
      </FormControl>
      <RichFeatureSwitch
        name={i18n('Download video thumbnail', 'options:features')}
        desc={i18n(
          'Download the thumbnail when the media is video.',
          'options:features'
        )}
        isOn={featureSettings.includeVideoThumbnail}
        handleClick={toggler.thumbnail}
        testId="videoThumbnail-feature-switch"
      />
    </VStack>
  )
}

export default FeatureOptions
