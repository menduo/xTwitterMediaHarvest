/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { posix as path } from 'path'

const supportedFormats = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export const makeTwitterArticleAssetFilename = (url: string): string => {
  const parsed = URL.canParse(url) ? new URL(url) : undefined
  if (!parsed) return 'image.jpg'

  const basename = path.basename(parsed.pathname)
  const mediaId = basename.includes('.') ? basename.split('.')[0] : basename
  const queryFormat = parsed.searchParams.get('format')?.toLowerCase()
  const pathExt = path.extname(parsed.pathname).replace('.', '').toLowerCase()
  const ext = normalizeExt(queryFormat) ?? normalizeExt(pathExt) ?? 'jpg'

  return `${mediaId}.${ext}`
}

export const makeTwitterArticleOriginalImageUrl = (url: string): string => {
  const parsed = URL.canParse(url) ? new URL(url) : undefined
  if (!parsed) return url

  const queryFormat = parsed.searchParams.get('format')?.toLowerCase()
  const pathExt = path.extname(parsed.pathname).replace('.', '').toLowerCase()
  const ext = normalizeExt(queryFormat) ?? normalizeExt(pathExt)
  if (!ext) return url

  parsed.searchParams.set('format', ext)
  parsed.searchParams.set('name', 'orig')
  return parsed.toString()
}

const normalizeExt = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  if (!supportedFormats.has(value)) return undefined
  return value === 'jpeg' ? 'jpg' : value
}
