import { type ReactNode, useEffect, useState } from 'react'
import { manifest } from 'vite-plugin-public-typescript/client'
import './App.css'

function formatManifst() {
  return Object.keys(manifest).map((key) => (
    <div key={key} style={{ display: 'flex' }}>
      <div>文件 {key}.ts 的 js uri 是：</div>
      <div>{manifest[key]}</div>
    </div>
  ))
}

function stringify(str: string | undefined) {
  if (!str) return null
  return JSON.stringify(str)
}

function App() {
  const [content, setContent] = useState<ReactNode>()

  useEffect(() => {
    if (window) {
      setContent(
        <>
          <h3>`import meta env`: </h3>
          <div id='env'>{stringify(window['VITE_ENV'])}</div>
          <br />
          <h3>自定义的环境变量:</h3>
          <div id='custom-define'>{stringify(window['VITE_DEFINE']['custom-define'])}</div>
          <div id='hello-world'>{stringify(window['VITE_DEFINE']['hello-world'])}</div>
          <br />
          <h3>hmr</h3>
          <div id='hmr'>{window['hmr']}</div>
        </>,
      )
    }
  }, [])

  return (
    <div className='App'>
      <h3 id='temp'>以下都是 vite-plugin-public-typescript 插件编译后，通过 manifest.json 文件获取的：</h3>
      <div className={'manifest'}>{formatManifst()}</div>
      <br />
      {content}
    </div>
  )
}

export default App
