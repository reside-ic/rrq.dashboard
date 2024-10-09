import dayjs from 'dayjs'
import localizedFormat from "dayjs/plugin/localizedFormat";

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import 'dayjs/locale/en-gb'
import 'dayjs/locale/en'

dayjs.extend(localizedFormat);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
], {
  basename: process.env.PUBLIC_URL,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
