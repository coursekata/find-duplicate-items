#!/usr/bin/env node
/**
 * CLI entry point for find-duplicate-items.
 * Used by pre-commit/prek hooks and direct CLI invocation.
 *
 * Usage: find-duplicate-items [--no-follow-symbolic-links] [patterns...]
 *
 * Patterns are glob patterns to search (default: current directory).
 */
import { type DuplicateMap, findDuplicateItems } from './find-duplicate-items.js'

// Suppress GitHub Actions debug output (::debug::) when running as CLI
const originalStdoutWrite = process.stdout.write.bind(process.stdout)
process.stdout.write = ((
  chunk: Uint8Array | string,
  encodingOrCallback?: BufferEncoding | ((err?: Error) => void),
  callback?: (err?: Error) => void
): boolean => {
  const str = typeof chunk === 'string' ? chunk : chunk.toString()
  if (str.startsWith('::debug::')) {
    return true
  }
  if (typeof encodingOrCallback === 'function') {
    return originalStdoutWrite(chunk, encodingOrCallback)
  }
  if (callback) {
    return originalStdoutWrite(chunk, encodingOrCallback, callback)
  }
  if (encodingOrCallback) {
    return originalStdoutWrite(chunk, encodingOrCallback)
  }
  return originalStdoutWrite(chunk)
}) as typeof process.stdout.write

interface CLIOptions {
  include: string[]
  followSymbolicLinks: boolean
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    include: [],
    followSymbolicLinks: true
  }

  for (const arg of args) {
    if (arg === '--no-follow-symbolic-links') {
      options.followSymbolicLinks = false
    } else if (!arg.startsWith('-')) {
      options.include.push(arg)
    }
  }

  if (options.include.length === 0) {
    options.include = ['.']
  }

  return options
}

function formatDuplicates(duplicates: DuplicateMap): string {
  const lines: string[] = []
  for (const [id, locations] of Object.entries(duplicates)) {
    lines.push(`Duplicate ID: ${id}`)
    for (const location of locations) {
      const lineInfo = location.line !== undefined ? `:${location.line}` : ''
      lines.push(`  ${location.file}${lineInfo}`)
    }
  }
  return lines.join('\n')
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const duplicates = await findDuplicateItems(options.include, options.followSymbolicLinks)

  const count = Object.keys(duplicates).length
  if (count > 0) {
    console.error(formatDuplicates(duplicates))
    console.error(`\nFound ${count} duplicate item${count === 1 ? '' : 's'}`)
    process.exitCode = 1
    return
  }

  process.exitCode = 0
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((error) => {
  if (error instanceof Error) {
    console.error('Error:', error.message)
  } else {
    console.error('Error:', String(error))
  }
  process.exitCode = 1
})
