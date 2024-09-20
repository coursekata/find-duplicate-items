import * as path from 'path'
import { findDuplicateItems, IDLocation } from '../src/find-duplicate-items'
import { relativizePaths } from '../src/utils'

const fixtureDir = path.join(__dirname, 'fixtures')
const globTestFiles = (pattern: string): string =>
  relativizePaths(path.join(fixtureDir, pattern, '*'))
const makeTestFilePath = (...parts: string[]): string =>
  relativizePaths(path.join(fixtureDir, ...parts))
const makeLocation = (id: string, file: string, line?: number): IDLocation => ({
  id: id,
  file: file,
  line: line
})

it('ignores non-markdown files and yields an empty object for no duplicates', async () => {
  // directory has one valid file with no duplicates and a duplicate file with txt extension
  // the txt file should be ignored, so no duplicates should be found
  const duplicates = await findDuplicateItems([globTestFiles('valid')])
  expect(duplicates).toEqual({})
})

it('ignores videos', async () => {
  const duplicates = await findDuplicateItems([
    globTestFiles('duplicate-videos')
  ])
  expect(duplicates).toEqual({})
})

it('tolerates HTML and partial HTML', async () => {
  const filepath = (name: string): string =>
    makeTestFilePath('contains-html', name)
  const location = (path: string, line?: number): IDLocation =>
    makeLocation('Pulse2', path, line)

  const duplicates = await findDuplicateItems([globTestFiles('contains-html')])
  expect(duplicates).toEqual({
    Pulse2: [
      location(filepath('full-html.html'), 6),
      location(filepath('full-html.html'), 20),
      location(filepath('indented-html.html'), 3),
      location(filepath('indented-html.html'), 17),
      location(filepath('partial-html.html'), 3),
      location(filepath('partial-html.html'), 17)
    ]
  })
})

it('finds duplicated IDs within a page', async () => {
  const filePath = (name: string): string =>
    makeTestFilePath('repeated-in-page', name)

  const duplicates = await findDuplicateItems([
    globTestFiles('repeated-in-page')
  ])
  expect(duplicates).toMatchObject({
    Pulse2: [
      makeLocation('Pulse2', filePath('doubled.md'), 4),
      makeLocation('Pulse2', filePath('doubled.md'), 9)
    ]
  })
})

it('finds duplicated IDs across pages', async () => {
  const filePath = (name: string): string =>
    makeTestFilePath('repeated-across-pages', name)

  const duplicates = await findDuplicateItems([
    globTestFiles('repeated-across-pages')
  ])
  expect(duplicates).toMatchObject({
    Pulse2: [
      makeLocation('Pulse2', filePath('duplicate.md'), 4),
      makeLocation('Pulse2', filePath('original.md'), 4)
    ]
  })
})
