import "./index.sass"

declare global {
    const BUILD_TYPE: "dev" | "pub";
    const PLATFORM: NodeJS.Platform;
}

// Take exclusive ownership of the API
const api = window.api.acquire();

// Expose libraries that can't be compartmentalized
import * as React from "react";
window.React = React;

import {createBrowserHistory} from "history";
import {Path as GalleryPath} from "./gallery";
const history = createBrowserHistory({ basename: window.location.pathname });
history.replace(GalleryPath);

import {Application} from "./application";
const application = React.createElement(Application, {
    history,
    api,
    document,
    window: {
        on: window.addEventListener.bind(window),
        off: window.removeEventListener.bind(window),

        close: () => api.window.close(),
        maximize: () => api.window.maximize(),
        minimize: () => api.window.minimize(),
        unmaximize: () => api.window.unmaximize(),
        getStatus: () => api.window.getStatus(),
    },
});

import {render} from "react-dom";
import {Router} from "react-router";
const dom = React.createElement(Router, {history}, application);

render(dom, document.getElementById("shell"), () => api.window.show());