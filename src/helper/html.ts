import type { DefaultTreeAdapterMap, ParserError, Token } from 'parse5'

export const VPPT_DATA_ATTR = 'data-vppt'

export async function traverseHtml(
  html: string,
  filePath: string,
  visitor: (node: DefaultTreeAdapterMap['node']) => void,
): Promise<void> {
  const { parse } = await import('parse5')
  const ast = parse(html, {
    scriptingEnabled: false, // parse inside <noscript>
    sourceCodeLocationInfo: true,
    onParseError: (e: ParserError) => {
      handleParseError(e, html, filePath)
    },
  })
  traverseNodes(ast, visitor)
}

function handleParseError(parserError: ParserError, html: string, filePath: string) {
  switch (parserError.code) {
    case 'missing-doctype':
      // ignore missing DOCTYPE
      return
    case 'abandoned-head-element-child':
      return
    case 'duplicate-attribute':
      return
    case 'non-void-html-element-start-tag-with-trailing-solidus':
      return
  }
  throw new Error(
    `Unable to parse HTML; parse5 error code ${parserError.code}\n` +
      ` at ${html}:${parserError.startLine}:${parserError.startCol}\n` +
      `${filePath}`,
  )
}

function traverseNodes(node: DefaultTreeAdapterMap['node'], visitor: (node: DefaultTreeAdapterMap['node']) => void) {
  visitor(node)
  if (nodeIsElement(node) || node.nodeName === '#document' || node.nodeName === '#document-fragment') {
    node.childNodes.forEach((childNode) => traverseNodes(childNode, visitor))
  }
}

export function nodeIsElement(node: DefaultTreeAdapterMap['node']): node is DefaultTreeAdapterMap['element'] {
  return node.nodeName[0] !== '#'
}

export function getScriptInfo(node: DefaultTreeAdapterMap['element']): {
  src: Token.Attribute | undefined
  sourceCodeLocation: Token.Location | undefined
  vppt: Token.Attribute | undefined
} {
  let src: Token.Attribute | undefined
  let sourceCodeLocation: Token.Location | undefined
  let vppt: Token.Attribute | undefined

  for (const p of node.attrs) {
    if (p.prefix !== undefined) continue
    if (p.name === 'src') {
      if (!src) {
        src = p
        sourceCodeLocation = node.sourceCodeLocation?.attrs!.src
      }
    }
    if (p.name === VPPT_DATA_ATTR) {
      vppt = p
    }
  }
  return { src, sourceCodeLocation, vppt }
}
