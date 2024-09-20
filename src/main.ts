import * as core from '@actions/core'
import { DuplicateMap, findDuplicateItems } from './find-duplicate-items'
import { relativizePaths } from './utils'

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
    inputs.include = core.getMultilineInput('include')
    inputs.followSymbolicLinks = core.getBooleanInput('follow-symbolic-links')
    inputs.failOnDuplicates = core.getBooleanInput('fail-on-duplicates')
  }

  core.debug(`include: ${inputs.include}`)
  core.debug(`followSymbolicLinks: ${inputs.followSymbolicLinks}`)
  core.debug(`failOnDuplicates: ${inputs.failOnDuplicates}`)

  return inputs
}

/**
 * The main function for the action.
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  safelyExecute(async () => {
    const inputs = getInputs()
    const duplicates = await findDuplicateItems(
      inputs.include,
      inputs.followSymbolicLinks
    )
    core.setOutput('duplicates', relativizePaths(JSON.stringify(duplicates)))
    if (Object.keys(duplicates).length) {
      await summarize(duplicates)
      core.setFailed('Duplicate items found, see summary for details')
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
      core.setFailed(error.message)
    } else {
      core.setFailed(String(error))
    }
  }
}

/**
 * Summarize the duplicate items found.
 * @param duplicates - The duplicate items found.
 * @returns Resolves when the summary is complete.
 */
async function summarize(duplicates: DuplicateMap): Promise<void> {
  await core.summary
    .addHeading('Duplicate Items Found')
    .addTable([
      [
        { data: 'ID', header: true },
        { data: 'Locations', header: true }
      ],
      ...Object.entries(duplicates).map(([id, locations]) => [
        id,
        locations
          .map(location => `${location.file}:${location.line}`)
          .join('<br>')
      ])
    ])
    .write()
}
