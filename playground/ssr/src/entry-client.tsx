import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.hydrateRoot(
  document.querySelector('#root') as HTMLElement,
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
