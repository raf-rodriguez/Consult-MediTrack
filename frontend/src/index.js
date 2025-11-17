import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';

// ✅ Loader global
import { LoadingProvider } from "./context/LoadingContext";
import GlobalLoader from "./components/GlobalLoader";

// ✅ Toastify
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <LoadingProvider>

      {/* Loader visible durante requests */}
      <GlobalLoader />

      {/* Tu aplicación completa */}
      <App />

      {/* Toasts globales */}
      <ToastContainer position="top-right" autoClose={2000} />

    </LoadingProvider>
  </React.StrictMode>
);

reportWebVitals();
