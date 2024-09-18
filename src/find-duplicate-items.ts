import * as path from 'path'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import { renderDOM } from './markdown'
import { relativizePaths } from './utils'

const log = { debug: (message: string) => core.debug(relativizePaths(message)) }

export type DuplicateMap = Record<string, Location[]>
export interface Location {
  file: string
  name: string
}

export async function findDuplicateItems(
  include: string[],
  followSymbolicLinks = true
): Promise<DuplicateMap> {
  const seen: DuplicateMap = {}
  const duplicates: DuplicateMap = {}
  const { files } = await globPages(include, followSymbolicLinks)
  for await (const file of files) {
    const document = await renderDOM(file)
    document.querySelectorAll('*[id]').forEach(element => {
      if ((element as HTMLElement).dataset.type == 'vimeo') {
        return
      }

      const location: Location = {
        file: relativizePaths(file),
        name: element.id
      }
      if (element.id in seen) {
        duplicates[element.id] = seen[element.id]
      }
      seen[element.id] = seen[element.id] || []
      seen[element.id].push(location)
    })
  }

  return duplicates
}

/**
 * Glob the page files.
 * @param include The glob patterns to search for.
 * @param followSymbolicLinks Whether to follow symbolic links.
 * @returns The list of files found and the search paths.
 */
async function globPages(
  include: string[],
  followSymbolicLinks: boolean
): Promise<{ files: string[]; searchPaths: string[] }> {
  log.debug(`Globbing for patterns: ${include.join(', ')}`)

  const globber = await glob.create(include.join('\n'), {
    followSymbolicLinks: followSymbolicLinks,
    matchDirectories: false
  })

  const globbedFiles = await globber.glob()
  const files = globbedFiles.filter(file => {
    return ['.html', '.md'].includes(path.parse(file).ext.toLowerCase())
  })

  log.debug(`Found page files: ${files.join(', ')}`)
  return { files, searchPaths: globber.getSearchPaths() }
}
