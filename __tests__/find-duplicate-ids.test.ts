import path from 'path'
import { findDuplicateItems, Location } from '../src/find-duplicate-items'
import { relativizePaths } from '../src/utils'

const fixture_dir = path.join(__dirname, 'fixtures')
const test_glob = (pattern: string): string =>
  relativizePaths(path.join(fixture_dir, pattern, '*'))
const test_path = (...parts: string[]): string =>
  relativizePaths(path.join(fixture_dir, ...parts))

it('finds no duplicates when a file has no duplicates', async () => {
  const duplicates = await findDuplicateItems([test_glob('value')])
  expect(duplicates).toEqual({})
})

it('ignores non-markdown files', async () => {
  const duplicates = await findDuplicateItems([test_glob('no-markdown')])
  expect(duplicates).toEqual({})
})

it('ignores videos', async () => {
  const duplicates = await findDuplicateItems([test_glob('duplicate-videos')])
  expect(duplicates).toEqual({})
})

it('tolerates HTML and partial HTML', async () => {
  const duplicates = await findDuplicateItems([test_glob('contains-html')])
  const file_path = (name: string): string => test_path('contains-html', name)
  expect(duplicates).toEqual({
    Pulse2: [
      { file: file_path('full-html.html'), name: 'Pulse2' },
      { file: file_path('full-html.html'), name: 'Pulse2' },
      { file: file_path('indented-html.html'), name: 'Pulse2' },
      { file: file_path('indented-html.html'), name: 'Pulse2' },
      { file: file_path('partial-html.html'), name: 'Pulse2' },
      { file: file_path('partial-html.html'), name: 'Pulse2' }
    ]
  })
})

it('finds duplicated IDs within a page', async () => {
  const file_path = (name: string): string =>
    test_path('repeated-in-page', name)
  const expected_ids = (name: string): Location[] => [
    { file: file_path('page-1-doubled.md'), name: name },
    { file: file_path('page-1-doubled.md'), name: name }
  ]

  const duplicates = await findDuplicateItems([test_glob('repeated-in-page')])
  expect(duplicates).toMatchObject({
    Pulse2: expected_ids('Pulse2'),
    'ch2-1': expected_ids('ch2-1'),
    'Ch2_Starting_1_r3.0': expected_ids('Ch2_Starting_1_r3.0'),
    'ch2-2': expected_ids('ch2-2')
  })
})

it('finds duplicated IDs across pages', async () => {
  const file_path = (name: string): string =>
    test_path('repeated-across-pages', name)
  const expected_ids = (name: string): Location[] => [
    { file: file_path('page-1-copy.md'), name: name },
    { file: file_path('page-1.md'), name: name }
  ]

  const duplicates = await findDuplicateItems([
    test_glob('repeated-across-pages')
  ])
  expect(duplicates).toMatchObject({
    Pulse2: expected_ids('Pulse2'),
    'ch2-1': expected_ids('ch2-1'),
    'Ch2_Starting_1_r3.0': expected_ids('Ch2_Starting_1_r3.0'),
    'ch2-2': expected_ids('ch2-2')
  })
})
