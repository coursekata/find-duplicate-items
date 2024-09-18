import * as path from 'path'
import { renderDOM, renderHTML } from '../src/markdown'

const fixtures_dir = path.join(__dirname, 'fixtures')

const test_file = path.join(fixtures_dir, 'valid/page-1.md')
const document_promise = renderDOM(test_file)

it('properly converts code fences with attributes', async () => {
  const document = await document_promise

  let element = document.getElementById('ch2-1')
  expect(element?.tagName).toBe('CODE')

  element = document.getElementById('ch2-2')
  expect(element?.tagName).toBe('CODE')
})

it('properly renders iframes on the page', async () => {
  const document = await document_promise

  let element = document.getElementById('Pulse2')
  expect(element?.tagName).toBe('IFRAME')

  element = document.getElementById('Ch2_Starting_1_r3.0')
  expect(element?.tagName).toBe('IFRAME')
})

it('works with indented HTML (full file indented by 4 spaces, not read as code block)', async () => {
  const regular = path.join(fixtures_dir, 'contains-html/partial-html.html')
  const indented = path.join(fixtures_dir, 'contains-html/indented-html.html')
  expect(await renderHTML(indented)).toBe(await renderHTML(regular))
})
