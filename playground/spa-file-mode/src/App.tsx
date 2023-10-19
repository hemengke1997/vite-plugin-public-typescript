import manifest from '../public-typescript/manifest.json'
import './App.css'

function formatManifst() {
  return Object.keys(manifest).map((key) => (
    <div key={key} style={{ display: 'flex' }}>
      <div>文件 {key}.ts 的 js uri 是：</div>
      <div>{(manifest as Record<string, string>)[key]}</div>
    </div>
  ))
}

function App() {
  return (
    <div className='App'>
      <h3 id='temp'>以下都是 vite-plugin-public-typescript 插件编译后，通过 manifest.json 文件获取的：</h3>
      <div>{formatManifst()}</div>

      <div>
        <h4>请打开控制台观察以上文件的打印</h4>
      </div>
    </div>
  )
}

export default App
