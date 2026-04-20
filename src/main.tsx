import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log("Main: Mounting application...");

window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global Error Caught:", { message, source, lineno, colno, error });
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <App />
  )
} else {
  console.error("Main: Root element not found!");
}
