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
const history = createBrowserHistory();
history.replace("/");

import {render} from "react-dom";
import {Router} from "react-router";
import {Application} from "./application";
const application = (
    <Router history={history}>
        <Application api={api} document={document} />
    </Router>
);

render(application, document.getElementById("shell"));