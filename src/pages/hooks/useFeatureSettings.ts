/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import type { ISettingsRepository } from '#domain/repositories/settings'
import type { InitPayloadAction, PureAction } from '#pages/types/reducerAction'
import type { FeatureSettings } from '#schema'
import { useCallback, useEffect, useReducer } from 'react'

function reducer(
  settings: FeatureSettings,
  action:
    | PureAction<
        | 'toggleNsfw'
        | 'toggleThumbnail'
        | 'toggleKeyboardShortcut'
        | 'toggleHoverTriggerDownload'
        | 'toggleAllowRedownloadExistingTweet'
      >
    | InitPayloadAction<
        Partial<
          Pick<
            FeatureSettings,
            'hoverTriggerDownloadDelayMs' | 'redownloadExistingTweetDelayDays'
          >
        >
      >
    | InitPayloadAction<FeatureSettings>
): FeatureSettings {
  switch (action.type) {
    case 'toggleNsfw':
      return { ...settings, autoRevealNsfw: !settings.autoRevealNsfw }

    case 'toggleThumbnail':
      return {
        ...settings,
        includeVideoThumbnail: !settings.includeVideoThumbnail,
      }

    case 'toggleKeyboardShortcut':
      return {
        ...settings,
        keyboardShortcut: !settings.keyboardShortcut,
      }

    case 'toggleHoverTriggerDownload':
      return {
        ...settings,
        hoverTriggerDownload: !settings.hoverTriggerDownload,
      }

    case 'toggleAllowRedownloadExistingTweet':
      return {
        ...settings,
        allowRedownloadExistingTweet: !settings.allowRedownloadExistingTweet,
      }

    case 'init':
      return { ...settings, ...action.payload }
  }
}

type Toggler = Record<
  | 'nsfw'
  | 'thumbnail'
  | 'keyboardShortcut'
  | 'hoverTriggerDownload'
  | 'allowRedownloadExistingTweet',
  () => Promise<void>
> & {
  hoverTriggerDownloadDelayMs: (value: number) => Promise<void>
  redownloadExistingTweetDelayDays: (value: number) => Promise<void>
}

const useFeatureSettings = (
  featureSettingsRepo: ISettingsRepository<FeatureSettings>
): [FeatureSettings, Toggler] => {
  const [featureSettings, dispatch] = useReducer(
    reducer,
    featureSettingsRepo.getDefault()
  )

  useEffect(() => {
    featureSettingsRepo.get().then(settings => {
      dispatch({
        type: 'init',
        payload: settings,
      })
    })
  }, [featureSettingsRepo])

  const toggleRevealNsfw = useCallback(async () => {
    await featureSettingsRepo.save({
      autoRevealNsfw: !featureSettings.autoRevealNsfw,
    })
    dispatch({ type: 'toggleNsfw' })
  }, [featureSettings.autoRevealNsfw, featureSettingsRepo])

  const toggleThumbnail = useCallback(async () => {
    await featureSettingsRepo.save({
      includeVideoThumbnail: !featureSettings.includeVideoThumbnail,
    })
    dispatch({ type: 'toggleThumbnail' })
  }, [featureSettings.includeVideoThumbnail, featureSettingsRepo])

  const toggleKeyboardShortcut = useCallback(async () => {
    await featureSettingsRepo.save({
      keyboardShortcut: !featureSettings.keyboardShortcut,
    })
    dispatch({ type: 'toggleKeyboardShortcut' })
  }, [featureSettings.keyboardShortcut, featureSettingsRepo])

  const toggleHoverTriggerDownload = useCallback(async () => {
    await featureSettingsRepo.save({
      hoverTriggerDownload: !featureSettings.hoverTriggerDownload,
    })
    dispatch({ type: 'toggleHoverTriggerDownload' })
  }, [featureSettings.hoverTriggerDownload, featureSettingsRepo])

  const toggleAllowRedownloadExistingTweet = useCallback(async () => {
    await featureSettingsRepo.save({
      allowRedownloadExistingTweet:
        !featureSettings.allowRedownloadExistingTweet,
    })
    dispatch({ type: 'toggleAllowRedownloadExistingTweet' })
  }, [featureSettings.allowRedownloadExistingTweet, featureSettingsRepo])

  const updateHoverTriggerDownloadDelayMs = useCallback(
    async (value: number) => {
      await featureSettingsRepo.save({
        hoverTriggerDownloadDelayMs: value,
      })
      dispatch({
        type: 'init',
        payload: { hoverTriggerDownloadDelayMs: value },
      })
    },
    [featureSettingsRepo]
  )

  const updateRedownloadExistingTweetDelayDays = useCallback(
    async (value: number) => {
      await featureSettingsRepo.save({
        redownloadExistingTweetDelayDays: value,
      })
      dispatch({
        type: 'init',
        payload: { redownloadExistingTweetDelayDays: value },
      })
    },
    [featureSettingsRepo]
  )

  return [
    featureSettings,
    {
      nsfw: toggleRevealNsfw,
      thumbnail: toggleThumbnail,
      keyboardShortcut: toggleKeyboardShortcut,
      hoverTriggerDownload: toggleHoverTriggerDownload,
      hoverTriggerDownloadDelayMs: updateHoverTriggerDownloadDelayMs,
      allowRedownloadExistingTweet: toggleAllowRedownloadExistingTweet,
      redownloadExistingTweetDelayDays: updateRedownloadExistingTweetDelayDays,
    },
  ]
}

export default useFeatureSettings
