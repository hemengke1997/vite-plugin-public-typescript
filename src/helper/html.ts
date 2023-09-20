import type { DefaultTreeAdapterMap, ParserError, Token } from 'parse5'
import type { HtmlTagDescriptor } from 'vite'

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

function serializeAttrs(attrs: HtmlTagDescriptor['attrs']): string {
  let res = ''
  for (const key in attrs) {
    if (typeof attrs[key] === 'boolean') {
      res += attrs[key] ? ` ${key}` : ``
    } else {
      res += ` ${key}=${JSON.stringify(attrs[key])}`
    }
  }
  return res
}

function incrementIndent(indent = '') {
  return `${indent}${indent[0] === '\t' ? '\t' : '  '}`
}

export function getAttrKey(attr: Token.Attribute): string {
  return attr.prefix === undefined ? attr.name : `${attr.prefix}:${attr.name}`
}

const unaryTags = new Set(['link', 'meta', 'base'])
function serializeTag({ tag, attrs, children }: HtmlTagDescriptor, indent = ''): string {
  if (unaryTags.has(tag)) {
    return `<${tag}${serializeAttrs(attrs)}>`
  } else {
    return `<${tag}${serializeAttrs(attrs)}>${serializeTags(children, incrementIndent(indent))}</${tag}>`
  }
}

function serializeTags(tags: HtmlTagDescriptor['children'], indent = ''): string {
  if (typeof tags === 'string') {
    return tags
  } else if (tags && tags.length) {
    return tags.map((tag) => `${indent}${serializeTag(tag, indent)}\n`).join('')
  }
  return ''
}
const headInjectRE = /([ \t]*)<\/head>/i
const headPrependInjectRE = /([ \t]*)<head[^>]*>/i

const htmlInjectRE = /<\/html>/i
const htmlPrependInjectRE = /([ \t]*)<html[^>]*>/i

const bodyInjectRE = /([ \t]*)<\/body>/i
const bodyPrependInjectRE = /([ \t]*)<body[^>]*>/i

const doctypePrependInjectRE = /<!doctype html>/i
function injectToHead(html: string, tags: HtmlTagDescriptor[], prepend = false) {
  if (tags.length === 0) return html

  if (prepend) {
    // inject as the first element of head
    if (headPrependInjectRE.test(html)) {
      return html.replace(headPrependInjectRE, (match, p1) => `${match}\n${serializeTags(tags, incrementIndent(p1))}`)
    }
  } else {
    // inject before head close
    if (headInjectRE.test(html)) {
      // respect indentation of head tag
      return html.replace(headInjectRE, (match, p1) => `${serializeTags(tags, incrementIndent(p1))}${match}`)
    }
    // try to inject before the body tag
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(bodyPrependInjectRE, (match, p1) => `${serializeTags(tags, p1)}\n${match}`)
    }
  }
  // if no head tag is present, we prepend the tag for both prepend and append
  return prependInjectFallback(html, tags)
}

function injectToBody(html: string, tags: HtmlTagDescriptor[], prepend = false) {
  if (tags.length === 0) return html

  if (prepend) {
    // inject after body open
    if (bodyPrependInjectRE.test(html)) {
      return html.replace(bodyPrependInjectRE, (match, p1) => `${match}\n${serializeTags(tags, incrementIndent(p1))}`)
    }
    // if no there is no body tag, inject after head or fallback to prepend in html
    if (headInjectRE.test(html)) {
      return html.replace(headInjectRE, (match, p1) => `${match}\n${serializeTags(tags, p1)}`)
    }
    return prependInjectFallback(html, tags)
  } else {
    // inject before body close
    if (bodyInjectRE.test(html)) {
      return html.replace(bodyInjectRE, (match, p1) => `${serializeTags(tags, incrementIndent(p1))}${match}`)
    }
    // if no body tag is present, append to the html tag, or at the end of the file
    if (htmlInjectRE.test(html)) {
      return html.replace(htmlInjectRE, `${serializeTags(tags)}\n$&`)
    }
    return `${html}\n${serializeTags(tags)}`
  }
}

function prependInjectFallback(html: string, tags: HtmlTagDescriptor[]) {
  // prepend to the html tag, append after doctype, or the document start
  if (htmlPrependInjectRE.test(html)) {
    return html.replace(htmlPrependInjectRE, `$&\n${serializeTags(tags)}`)
  }
  if (doctypePrependInjectRE.test(html)) {
    return html.replace(doctypePrependInjectRE, `$&\n${serializeTags(tags)}`)
  }
  return serializeTags(tags) + html
}

export function injectTagsToHtml(html: string, tags: HtmlTagDescriptor[]): string {
  const headTags: HtmlTagDescriptor[] = []
  const headPrependTags: HtmlTagDescriptor[] = []
  const bodyTags: HtmlTagDescriptor[] = []
  const bodyPrependTags: HtmlTagDescriptor[] = []

  for (const tag of tags) {
    if (tag.injectTo === 'body') {
      bodyTags.push(tag)
    } else if (tag.injectTo === 'body-prepend') {
      bodyPrependTags.push(tag)
    } else if (tag.injectTo === 'head') {
      headTags.push(tag)
    } else {
      headPrependTags.push(tag)
    }
  }

  html = injectToHead(html, headPrependTags, true)
  html = injectToHead(html, headTags)
  html = injectToBody(html, bodyPrependTags, true)
  html = injectToBody(html, bodyTags)

  return html
}
