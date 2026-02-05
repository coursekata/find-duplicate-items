import {
  debug,
  getBooleanInput,
  getMultilineInput,
  setFailed,
  setOutput,
  summary,
  warning
} from '@actions/core'
import { type DuplicateMap, findDuplicateItems } from './find-duplicate-items.js'
import { relativizePaths } from './utils.js'

interface ActionInputs {
  include: string[]
  followSymbolicLinks: boolean
  failOnDuplicates: boolean
}

/**
 * Get the inputs for the action.
 * @returns The inputs for the action.
 */
function getInputs(): ActionInputs {
  const inputs: ActionInputs = {
    include: ['.'],
    followSymbolicLinks: false,
    failOnDuplicates: false
  }

  if (process.env.GITHUB_ACTIONS) {
    inputs.include = getMultilineInput('include')
    inputs.followSymbolicLinks = getBooleanInput('follow-symbolic-links')
    inputs.failOnDuplicates = getBooleanInput('fail-on-duplicates')
  }

  debug(`include: ${inputs.include}`)
  debug(`followSymbolicLinks: ${inputs.followSymbolicLinks}`)
  debug(`failOnDuplicates: ${inputs.failOnDuplicates}`)

  return inputs
}

/**
 * The main function for the action.
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  safelyExecute(async () => {
    const inputs = getInputs()
    const duplicates = await findDuplicateItems(inputs.include, inputs.followSymbolicLinks)
    setOutput('duplicates', relativizePaths(JSON.stringify(duplicates)))
    if (Object.keys(duplicates).length) {
      await summarize(duplicates)
      if (inputs.failOnDuplicates) {
        setFailed('Duplicate items found, see summary for details')
      } else {
        warning('Duplicate items found, see summary for details')
      }
    }
  })
}

/**
 * Safely execute an action, catching any errors and setting the action as failed.
 * @param action - The action to execute.
 * @returns Resolves when the action is complete.
 */
async function safelyExecute(action: () => Promise<void>): Promise<void> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message)
    } else {
      setFailed(String(error))
    }
  }
}

/**
 * Summarize the duplicate items found.
 * @param duplicates - The duplicate items found.
 * @returns Resolves when the summary is complete.
 */
async function summarize(duplicates: DuplicateMap): Promise<void> {
  await summary
    .addHeading('Duplicate Items Found')
    .addTable([
      [
        { data: 'ID', header: true },
        { data: 'Locations', header: true }
      ],
      ...Object.entries(duplicates).map(([id, locations]) => [
        id,
        locations.map((location) => `${location.file}:${location.line}`).join('<br>')
      ])
    ])
    .write()
}
