import ReactDOM from 'react-dom/client'

ReactDOM.hydrateRoot(
  document.querySelector('#app'),
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
console.log('hydrated')
