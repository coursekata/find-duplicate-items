import * as fs from 'fs/promises'
import * as path from 'path'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import { Parser } from 'htmlparser2'
import MarkdownIt from 'markdown-it'
import markdownItAttrs from 'markdown-it-attrs'
import { relativizePaths } from './utils'

const log = { debug: (message: string) => core.debug(relativizePaths(message)) }
const markdown_parser = new MarkdownIt({ html: true })
markdown_parser.use(markdownItAttrs)

export type DuplicateMap = Record<string, IDLocation[]>
export interface IDLocation {
  id: string
  file: string
  line: number | undefined
}

/**
 * Find duplicate items in the specified files.
 * @param include The glob patterns to search for.
 * @param followSymbolicLinks Whether to follow symbolic links.
 * @returns The map of duplicate items and their locations.
 */
export async function findDuplicateItems(
  include: string[],
  followSymbolicLinks = true
): Promise<DuplicateMap> {
  let locations: IDLocation[] = []
  const { files } = await globPages(include, followSymbolicLinks)
  for await (const file of files) {
    const ext = path.parse(file).ext.toLowerCase()
    if (ext === '.md') {
      locations = locations.concat(await getIDsFromMarkdown(file))
    } else if (ext === '.html') {
      locations = locations.concat(await getIDsFromHTML(file))
    } else {
      throw new Error(`Unsupported file extension: ${ext}`)
    }
  }

  const seen: DuplicateMap = {}
  const duplicates: DuplicateMap = {}
  locations.forEach(location => {
    location.file = relativizePaths(location.file)
    if (location.id in seen) {
      duplicates[location.id] = seen[location.id]
    }
    seen[location.id] = seen[location.id] || []
    seen[location.id].push(location)
  })

  Object.keys(duplicates).forEach(key => {
    duplicates[key].sort((a, b) => {
      if (a.file < b.file) return -1
      if (a.file > b.file) return 1
      if (a.line !== undefined && b.line !== undefined) {
        return a.line - b.line
      }
      return 0
    })
  })

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

/**
 * Extracts the IDs and their locations from a markdown file.
 * @param path The path to the markdown file to extract IDs from.
 * @returns The list of IDs and their locations.
 */
async function getIDsFromMarkdown(path: string): Promise<IDLocation[]> {
  const tokens = await fs
    .readFile(path, 'utf-8')
    .then(contents => markdown_parser.parse(contents, {}))

  const idsWithLines: IDLocation[] = []
  tokens.forEach(token => {
    const idAttr = token.attrs?.find(attr => attr[0] === 'id')
    const videoAttr = token.attrs?.find(
      attr => attr[0] === 'data-type' && attr[1] === 'vimeo'
    )
    if (idAttr && !videoAttr) {
      idsWithLines.push({
        id: idAttr[1],
        file: path,
        line: token.map ? token.map[0] + 1 : 0
      })
    }

    if (token.type === 'html_block') {
      const resolveBlockLines = (
        line: number | undefined
      ): number | undefined =>
        line && token.map ? line - 1 + token.map[0] + 1 : undefined

      getIDsFromHTMLBlock(token.content).forEach(location =>
        idsWithLines.push({
          id: location.id,
          file: path,
          line: resolveBlockLines(location.line)
        })
      )
    }
  })

  return idsWithLines
}

/**
 * Extracts the IDs and their locations from an HTML file.
 * @param path The path to the HTML file to extract IDs from.
 * @returns The list of IDs and their line numbers within the file.
 */
async function getIDsFromHTML(path: string): Promise<IDLocation[]> {
  return await fs
    .readFile(path, 'utf-8')
    .then(content => getIDsFromHTMLBlock(content))
    .then(locations => locations.map(location => ({ ...location, file: path })))
}

/**
 * Extracts the IDs and their locations from an HTML block.
 * @param block The HTML block to extract IDs from.
 * @returns The list of IDs and their line numbers within the block.
 */
function getIDsFromHTMLBlock(block: string): Omit<IDLocation, 'file'>[] {
  const idsWithLines: Omit<IDLocation, 'file'>[] = []
  let currentLine = 1
  let addedIdThisBlock = false
  const parser = new Parser(
    {
      // onattribute fires as the attribute is being read, so the currentLine is the line it is on
      onattribute(name: string, value: string): void {
        if (name === 'id') {
          addedIdThisBlock = true
          idsWithLines.push({
            id: value,
            line: currentLine
          })
        }
      },
      // onopentag fires after the tag is read, so the currentLine may not be the line the id is on
      // but this event allows us to filter tags based on attributes
      onopentag(name: string, attribs: { [s: string]: string }): void {
        if (attribs['data-type'] === 'vimeo' && addedIdThisBlock) {
          idsWithLines.pop()
        }
        addedIdThisBlock = false
      }
    },
    { decodeEntities: true }
  )

  block.split('\n').forEach(line => {
    parser.write(line)
    currentLine++
  })
  parser.end()

  return idsWithLines
}
