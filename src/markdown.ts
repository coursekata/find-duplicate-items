import * as fs from 'fs/promises'
import dedent from 'dedent'
import { JSDOM } from 'jsdom'
import MarkdownIt from 'markdown-it'
import markdownItAttrs from 'markdown-it-attrs'

const parser = new MarkdownIt({ html: true })
parser.use(markdownItAttrs)

export async function renderHTML(markdown_file: string): Promise<string> {
  return fs
    .readFile(markdown_file, 'utf-8')
    .then(contents => dedent(contents))
    .then(contents => parser.render(contents))
}

export async function renderDOM(markdown_file: string): Promise<Document> {
  const dom = await renderHTML(markdown_file).then(html => new JSDOM(html))
  return dom.window.document
}
