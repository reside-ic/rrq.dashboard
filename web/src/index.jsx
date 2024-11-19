import dayjs from 'dayjs'
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import 'dayjs/locale/en-gb'
import 'dayjs/locale/en'

import './index.css';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@gfazioli/mantine-split-pane/styles.css';
import 'mantine-react-table/styles.css';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
], {
  basename: import.meta.env.BASE_URL,
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
