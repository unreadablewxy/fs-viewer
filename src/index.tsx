import "./index.sass"

// Take exclusive ownership of the API
if (!window.api)
    throw new Error("API unset, possibly a bad build");

const api = window.api;
delete window.api;

// Expose libraries that can't be compartmentalized
import * as React from "react";
window.React = React;

import {createBrowserHistory} from "history";

const props = {
    history: createBrowserHistory({
        basename: window.location.pathname,
    }),
    api,
    document,
};

import {Path as GalleryPath} from "./gallery";
props.history.replace(GalleryPath);

import {render} from "react-dom";
import {Router} from "react-router";
import {Application} from "./application";
const application = (
    <Router history={props.history}>
        <Application {...props} />
    </Router>
);

render(application, document.getElementById("shell"));