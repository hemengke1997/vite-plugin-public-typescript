import ReactDOMServer from 'react-dom/server'

export function render(url, context) {
  return ReactDOMServer.renderToString(
    <StaticRouter location={url} context={context}>
      <App />
    </StaticRouter>,
  )
}
