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

it('finds no duplicates when a file has no duplicates', async () => {
  const duplicates = await findDuplicateItems([globTestFiles('value')])
  expect(duplicates).toEqual({})
})

it('ignores non-markdown files', async () => {
  const duplicates = await findDuplicateItems([globTestFiles('no-markdown')])
  expect(duplicates).toEqual({})
})

it('ignores videos', async () => {
  const duplicates = await findDuplicateItems([
    globTestFiles('duplicate-videos')
  ])
  expect(duplicates).toEqual({})
})

it('tolerates HTML and partial HTML', async () => {
  const duplicates = await findDuplicateItems([globTestFiles('contains-html')])

  const filepath = (name: string): string =>
    makeTestFilePath('contains-html', name)
  const location = (path: string, line?: number): IDLocation =>
    makeLocation('Pulse2', path, line)
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
  const expectedIDs = (name: string, lines: number[]): IDLocation[] => [
    makeLocation(name, filePath('page-1-doubled.md'), lines[0]),
    makeLocation(name, filePath('page-1-doubled.md'), lines[1])
  ]

  const duplicates = await findDuplicateItems([
    globTestFiles('repeated-in-page')
  ])
  expect(duplicates).toMatchObject({
    Pulse2: expectedIDs('Pulse2', [1, 127]),
    'ch2-1': expectedIDs('ch2-1', [36, 162]),
    'Ch2_Starting_1_r3.0': expectedIDs('Ch2_Starting_1_r3.0', [91, 217]),
    'ch2-2': expectedIDs('ch2-2', [93, 219])
  })
})

it('finds duplicated IDs across pages', async () => {
  const filePath = (name: string): string =>
    makeTestFilePath('repeated-across-pages', name)
  const expectedIDs = (name: string, line: number): IDLocation[] => [
    makeLocation(name, filePath('page-1-copy.md'), line),
    makeLocation(name, filePath('page-1.md'), line)
  ]

  const duplicates = await findDuplicateItems([
    globTestFiles('repeated-across-pages')
  ])
  expect(duplicates).toMatchObject({
    Pulse2: expectedIDs('Pulse2', 1),
    'ch2-1': expectedIDs('ch2-1', 36),
    'ch2-2': expectedIDs('ch2-2', 93),
    'Ch2_Starting_1_r3.0': expectedIDs('Ch2_Starting_1_r3.0', 91)
  })
})
