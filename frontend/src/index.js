import React from 'react';
import ReactDOM from 'react-dom/client';
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Theme appearance="light" accentColor="iris" grayColor="mauve" radius="large" scaling="100%">
      <App />
    </Theme>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
