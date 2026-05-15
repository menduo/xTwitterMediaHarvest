/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  AggregationToken,
  FilenameSetting,
} from '#domain/valueObjects/filenameSetting'
import PatternToken from '#enums/patternToken'
import { posix as path } from 'path'

type TweetMarkdownFilenameSource = {
  tweetId: string
  screenName: string
  createdAt?: Date
  userId?: string
}

const MARKDOWN_SORT_SUFFIX = '00'

export const makeTweetMarkdownFilename = (
  filenameSetting: FilenameSetting,
  source: TweetMarkdownFilenameSource
): string => {
  const currentDate = new Date()
  const tweetDate = source.createdAt ?? currentDate
  const filenamePattern = filenameSetting.mapBy(props => props.filenamePattern)

  if (filenamePattern.length === 0)
    throw new Error("Filename pattern can't be empty.")

  const filename = filenamePattern
    .join('-')
    .replace(PatternToken.Account, source.screenName)
    .replace(PatternToken.AccountId, source.userId ?? source.screenName)
    .replace(PatternToken.TweetId, source.tweetId)
    .replace(PatternToken.Serial, '01')
    .replace(PatternToken.Hash, source.tweetId)
    .replace(PatternToken.Date, makeDateString(currentDate))
    .replace(PatternToken.Datetime, makeDatetimeString(currentDate))
    .replace(
      PatternToken.UnderscoreDateTime,
      makeUnderscoreDatetimeString(currentDate)
    )
    .replace(PatternToken.Timestamp, currentDate.getTime().toString())
    .replace(PatternToken.TweetDate, makeDateString(tweetDate))
    .replace(PatternToken.TweetDatetime, makeDatetimeString(tweetDate))
    .replace(
      PatternToken.UnderscoreTweetDatetime,
      makeUnderscoreDatetimeString(tweetDate)
    )
    .replace(PatternToken.TweetTimestamp, tweetDate.getTime().toString())

  return path.format({
    dir: makeAggregationDirectory(filenameSetting, source.screenName),
    name: `${filename}-${MARKDOWN_SORT_SUFFIX}`,
    ext: '.md',
  })
}

const makeAggregationDirectory = (
  filenameSetting: FilenameSetting,
  screenName: string
) => {
  const { directory, fileAggregation, groupBy, noSubDirectory } =
    filenameSetting.mapBy(props => props)
  const baseDir = noSubDirectory ? '' : directory

  if (!fileAggregation) return baseDir

  switch (groupBy) {
    case AggregationToken.Account:
      return path.join(baseDir, screenName)
    default:
      return baseDir
  }
}

const makeDatetimeString = (date: Date): string =>
  String(date.getFullYear()) +
  String(date.getMonth() + 1).padStart(2, '0') +
  String(date.getDate()).padStart(2, '0') +
  String(date.getHours()).padStart(2, '0') +
  String(date.getMinutes()).padStart(2, '0') +
  String(date.getSeconds()).padStart(2, '0')

const makeDateString = (date: Date): string =>
  String(date.getFullYear()) +
  String(date.getMonth() + 1).padStart(2, '0') +
  String(date.getDate()).padStart(2, '0')

const makeUnderscoreDatetimeString = (date: Date): string =>
  String(date.getFullYear()) +
  String(date.getMonth() + 1).padStart(2, '0') +
  String(date.getDate()).padStart(2, '0') +
  '_' +
  String(date.getHours()).padStart(2, '0') +
  String(date.getMinutes()).padStart(2, '0') +
  String(date.getSeconds()).padStart(2, '0')
