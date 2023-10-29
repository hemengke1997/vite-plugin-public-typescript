import { manifest } from 'vite-plugin-public-typescript/client'

export default function App() {
  function formatManifst() {
    return Object.keys(manifest).map((key) => (
      <div key={key} style={{ display: 'flex' }}>
        <div>文件 {key}.ts 的 js uri 是：</div>
        <div>{manifest[key]}</div>
      </div>
    ))
  }
  return (
    <>
      <div>this is app</div>
      <div className={'manifest'}>{formatManifst()}</div>
    </>
  )
}
