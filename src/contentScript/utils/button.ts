/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  CheckDownloadHistoryMessage,
  DownloadTweetMediaMessage,
  SaveTweetContentMessage,
  SaveTwitterArticleMessage,
  sendMessage,
} from '#libs/webExtMessage'
import type { FeatureSettings } from '#schema'
import {
  articleHasMedia,
  getClosedTargetArticle,
  getTweetContentFromArticleChildElement,
  getTweetCreatedAtFromArticleChildElement,
  getTweetInfoFromArticleChildElement,
} from './article'
import { getTwitterArticleFromArticleChildElement } from './twitterArticle'

type ButtonElement = HTMLElement
type TriggerSource = 'click' | 'hover'
type ButtonFeatureSettings = Pick<
  FeatureSettings,
  | 'hoverTriggerDownload'
  | 'hoverTriggerDownloadDelayMs'
  | 'allowRedownloadExistingTweet'
  | 'redownloadExistingTweetDelayDays'
>

const HOVER_TRIGGER_EFFECT_MS = 1200
const HOVER_TRIGGERED_DATASET_KEY = 'hoverTriggered'
const DOWNLOAD_TIME_DATASET_KEY = 'downloadTime'
const DAY_MS = 24 * 60 * 60 * 1000

let buttonFeatureSettings: ButtonFeatureSettings = {
  hoverTriggerDownload: false,
  hoverTriggerDownloadDelayMs: 200,
  allowRedownloadExistingTweet: true,
  redownloadExistingTweetDelayDays: 7,
}
let buttonFeatureSettingsLoader:
  | (() => Promise<ButtonFeatureSettings>)
  | undefined

export const enum ButtonStatus {
  Downloading = 'downloading',
  Success = 'success',
  Error = 'error',
  Downloaded = 'downloaded',
  HoverTriggered = 'hover-triggered',
}

export const setButtonFeatureSettings = (
  settings: ButtonFeatureSettings
): void => {
  buttonFeatureSettings = settings
}

export const setButtonFeatureSettingsLoader = (
  loader: () => Promise<ButtonFeatureSettings>
): void => {
  buttonFeatureSettingsLoader = loader
}

const refreshButtonFeatureSettings =
  async (): Promise<ButtonFeatureSettings> => {
    if (!buttonFeatureSettingsLoader) return buttonFeatureSettings
    buttonFeatureSettings = await buttonFeatureSettingsLoader()
    return buttonFeatureSettings
  }

const cleanButtonStatus = (button: HTMLElement) => {
  button.classList.remove(
    ButtonStatus.Downloading,
    ButtonStatus.Success,
    ButtonStatus.Error,
    ButtonStatus.Downloaded
  )
  return button
}

const setButtonStatus = (status: ButtonStatus) => (button: ButtonElement) => {
  cleanButtonStatus(button)
  button.classList.add(status)
  return button
}

const isDownloadingButton = (button: ButtonElement) =>
  button.classList.contains(ButtonStatus.Downloading)

const isDownloadedButton = (button: ButtonElement) =>
  button.classList.contains(ButtonStatus.Downloaded)

const wasHoverTriggered = (button: ButtonElement) =>
  button.dataset[HOVER_TRIGGERED_DATASET_KEY] === 'true'

const markHoverTriggered = (button: ButtonElement) => {
  button.dataset[HOVER_TRIGGERED_DATASET_KEY] = 'true'
}

const cleanHoverTriggered = (button: ButtonElement) => {
  delete button.dataset[HOVER_TRIGGERED_DATASET_KEY]
}

const setDownloadTime = (button: ButtonElement, downloadTime?: string) => {
  if (!downloadTime) {
    delete button.dataset[DOWNLOAD_TIME_DATASET_KEY]
    return
  }
  button.dataset[DOWNLOAD_TIME_DATASET_KEY] = downloadTime
}

const getDownloadTime = (button: ButtonElement): Date | undefined => {
  const downloadTime = button.dataset[DOWNLOAD_TIME_DATASET_KEY]
  if (!downloadTime) return undefined

  const date = new Date(downloadTime)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

const canRedownloadExistingTweet = (button: ButtonElement): boolean => {
  const downloadTime = getDownloadTime(button)
  if (!isDownloadedButton(button) && !downloadTime) return true
  if (!buttonFeatureSettings.allowRedownloadExistingTweet) return false

  if (!downloadTime) return true

  const delayDays = Math.max(
    0,
    buttonFeatureSettings.redownloadExistingTweetDelayDays
  )
  return Date.now() - downloadTime.getTime() >= delayDays * DAY_MS
}

const setHoverTriggeredEffect = (button: ButtonElement) => {
  button.classList.add(ButtonStatus.HoverTriggered)
  window.setTimeout(() => {
    button.classList.remove(ButtonStatus.HoverTriggered)
  }, HOVER_TRIGGER_EFFECT_MS)
}

const responseStatusToButtonStatus = (respStatus: 'ok' | 'error') =>
  respStatus === 'ok' ? ButtonStatus.Success : ButtonStatus.Error

const applyResponseStatus =
  (button: ButtonElement) => (respStatus: 'ok' | 'error') => {
    if (respStatus === 'ok') setDownloadTime(button, new Date().toISOString())
    if (respStatus === 'error') cleanHoverTriggered(button)
    return setButtonStatus(responseStatusToButtonStatus(respStatus))(button)
  }

const isMediaButton = (button: HTMLElement) => {
  const article = getClosedTargetArticle(button)
  return article ? articleHasMedia(article) : false
}

const saveTweetContentOrMedia = (button: ButtonElement) => {
  const { value, error } = getTweetInfoFromArticleChildElement(button)
  if (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    return setButtonStatus(ButtonStatus.Error)(button)
  }

  const message = new DownloadTweetMediaMessage(value.mapBy(props => props))
  const contentResult = getTweetContentFromArticleChildElement(button)
  const createdAt = getTweetCreatedAtFromArticleChildElement(button)
  const saveContentMessage = contentResult.value
    ? new SaveTweetContentMessage({
        ...value.mapBy(props => props),
        content: contentResult.value,
        createdAt,
      })
    : undefined

  if (!isMediaButton(button)) {
    if (!saveContentMessage) return setButtonStatus(ButtonStatus.Error)(button)

    return sendMessage(saveContentMessage).then(resp =>
      applyResponseStatus(button)(resp.status)
    )
  }

  if (saveContentMessage) void sendMessage(saveContentMessage)

  sendMessage(message).then(resp => applyResponseStatus(button)(resp.status))
}

export const triggerDownloadFromButton = (
  button: ButtonElement,
  source: TriggerSource
) => {
  if (
    source === 'hover' &&
    isDownloadedButton(button) &&
    !canRedownloadExistingTweet(button)
  )
    return
  if (source === 'hover' && wasHoverTriggered(button)) return
  if (isDownloadingButton(button)) return

  if (source === 'hover') {
    markHoverTriggered(button)
    setHoverTriggeredEffect(button)
  }

  setButtonStatus(ButtonStatus.Downloading)(button)
  const { value, error } = getTweetInfoFromArticleChildElement(button)
  if (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    if (source === 'hover') cleanHoverTriggered(button)
    return setButtonStatus(ButtonStatus.Error)(button)
  }
  const article = getTwitterArticleFromArticleChildElement(button)
  if (article) {
    const createdAt = getTweetCreatedAtFromArticleChildElement(button)
    const saveArticleMessage = new SaveTwitterArticleMessage({
      ...value.mapBy(props => props),
      createdAt,
    })

    return sendMessage(saveArticleMessage).then(resp => {
      if (resp.status === 'ok') {
        setDownloadTime(button, new Date().toISOString())
        return setButtonStatus(ButtonStatus.Success)(button)
      }
      if (source === 'hover') cleanHoverTriggered(button)
      return saveTweetContentOrMedia(button)
    })
  }

  return saveTweetContentOrMedia(button)
}

const buttonClickHandler = (e: MouseEvent) => {
  e.stopImmediatePropagation()
  const target = e.target
  if (!(target instanceof Element)) return

  const button = target.closest<HTMLElement>('.harvester')
  if (!button) return

  return triggerDownloadFromButton(button, 'click')
}

const makeButtonHoverHandler = (button: ButtonElement) => {
  let triggerTimer: number | undefined

  const cleanTimer = () => {
    if (triggerTimer === undefined) return
    window.clearTimeout(triggerTimer)
    triggerTimer = undefined
  }

  const mouseEnterHandler = () => {
    const startHoverTimer = () => {
      if (!buttonFeatureSettings.hoverTriggerDownload) return
      if (!canRedownloadExistingTweet(button)) return
      if (isDownloadingButton(button)) return
      if (wasHoverTriggered(button)) return

      cleanTimer()
      triggerTimer = window.setTimeout(() => {
        triggerTimer = undefined
        triggerDownloadFromButton(button, 'hover')
      }, buttonFeatureSettings.hoverTriggerDownloadDelayMs)
    }

    void refreshButtonFeatureSettings().then(startHoverTimer, startHoverTimer)
  }

  button.addEventListener('mouseenter', mouseEnterHandler)
  button.addEventListener('mouseleave', cleanTimer)
}

export const makeButtonListener = <T extends ButtonElement>(button: T): T => {
  button.addEventListener('click', buttonClickHandler)
  makeButtonHoverHandler(button)
  return button
}

export const checkButtonStatus = <T extends ButtonElement>(button: T): T => {
  const { value, error } = getTweetInfoFromArticleChildElement(button)
  if (error) return button

  const message = new CheckDownloadHistoryMessage({ tweetId: value.tweetId })
  sendMessage(message).then(resp => {
    if (resp.status === 'error') return button
    if (isDownloadingButton(button)) return button
    if (resp.payload.isExist) {
      setDownloadTime(button, resp.payload.downloadTime)
      return setButtonStatus(ButtonStatus.Downloaded)(button)
    }
    if (!resp.payload.isExist) {
      setDownloadTime(button)
      return cleanButtonStatus(button)
    }
    return button
  })

  return button
}
