import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

//Redux
import { Provider } from 'react-redux';
import { storeInstance } from './store/store.ts';



import App from './App.tsx'

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service Worker Registered Successfully"))
      .catch((error) => {
        console.error("Service Worker Registration Failed:", error);
      });
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={storeInstance}>
      <App />
    </Provider>
  </StrictMode>
)
