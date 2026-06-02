/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ValueObject } from './base'

export type TwitterArticleInline = {
  text: string
  href?: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

export type TwitterArticleBlock =
  | {
      type: 'heading'
      level: 1 | 2 | 3
      children: TwitterArticleInline[]
    }
  | {
      type: 'paragraph'
      children: TwitterArticleInline[]
    }
  | {
      type: 'unordered-list-item' | 'ordered-list-item'
      depth: number
      children: TwitterArticleInline[]
    }
  | {
      type: 'blockquote'
      children: TwitterArticleInline[]
    }
  | {
      type: 'image'
      imageId: string
      alt?: string
    }
  | {
      type: 'unknown'
      text: string
    }

export type TwitterArticleImage = {
  imageId: string
  url: string
  filename: string
}

export type TwitterArticleProps = {
  tweetId: string
  articleId: string
  screenName: string
  title?: string
  createdAt?: string
  sourceUrl: string
  blocks: TwitterArticleBlock[]
  images: TwitterArticleImage[]
}

export class TwitterArticle extends ValueObject<TwitterArticleProps> {
  get id() {
    return this.props.tweetId
  }

  get tweetId() {
    return this.props.tweetId
  }

  get blocks() {
    return this.props.blocks
  }

  get images() {
    return this.props.images
  }

  static create(props: TwitterArticleProps) {
    return new TwitterArticle(props)
  }
}
