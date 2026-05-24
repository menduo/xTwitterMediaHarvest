/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const Pattern = Object.freeze({
  tweetRelated:
    /^(?:\/i\/api)?\/graphql\/(?<queryId>.+)?\/(?<queryName>TweetDetail|TweetResultByRestId|UserTweets|UserMedia|HomeTimeline|HomeLatestTimeline|UserTweetsAndReplies|UserHighlightsTweets|UserArticlesTweets|Bookmarks|Likes|CommunitiesExploreTimeline|ListLatestTweetsTimeline|SearchTimeline)$/,
})

const enum MediaHarvestEvent {
  MediaResponse = 'mh:media-response',
}

type TxTarget = {
  method: string
  path: string
}

const requestPathWeakMap = new WeakMap<XMLHttpRequest, TxTarget>()
const requestTransactionIdWeakMap = new WeakMap<XMLHttpRequest, string>()

function validateUrl(url: string | URL | undefined): URL | undefined {
  if (!url) return undefined
  if (url instanceof URL) return url
  if (URL.canParse(url)) return new URL(url)
  return undefined
}

XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
  apply(target, thisArg: XMLHttpRequest, args) {
    const [method, url] = args

    const validUrl = validateUrl(url)
    if (validUrl && validUrl.pathname.match(Pattern.tweetRelated)) {
      thisArg.addEventListener('load', captureResponse)
      requestPathWeakMap.set(thisArg, {
        method,
        path: validUrl.pathname,
      })
    }

    return Reflect.apply(target, thisArg, args)
  },
})

XMLHttpRequest.prototype.setRequestHeader = new Proxy(
  XMLHttpRequest.prototype.setRequestHeader,
  {
    apply(target, thisArg: XMLHttpRequest, args) {
      const [name, value] = args
      const targetInfo = requestPathWeakMap.get(thisArg)

      if (
        targetInfo &&
        typeof name === 'string' &&
        name.toLowerCase() === 'x-client-transaction-id' &&
        typeof value === 'string'
      ) {
        requestTransactionIdWeakMap.set(thisArg, value)
      }

      return Reflect.apply(target, thisArg, args)
    },
  }
)

function captureResponse(this: XMLHttpRequest, _ev: ProgressEvent) {
  if (this.status === 200) {
    const url = URL.parse(this.responseURL)
    if (!url) return
    const targetInfo = requestPathWeakMap.get(this)

    const event = new CustomEvent<MediaHarvest.MediaResponseDetail>(
      MediaHarvestEvent.MediaResponse,
      {
        detail: {
          path: url.pathname,
          method: targetInfo?.method ?? 'GET',
          status: this.status,
          body: this.responseText,
          transactionId: requestTransactionIdWeakMap.get(this),
        },
      }
    )

    document.dispatchEvent(event)
  }
}
