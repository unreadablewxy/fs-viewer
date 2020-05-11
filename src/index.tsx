import "./index.sass"
import {createBrowserHistory} from "history";
import * as React from "react";
import {render} from "react-dom";
import {Router} from "react-router";

import {Shell} from "./shell";

const loadPrefsTask = window.api.loadPreferences();
const history = createBrowserHistory();
const shellElement = document.getElementById("shell");

loadPrefsTask.then(prefs => {
    const application =
    <Router history={history}>
        <Shell api={window.api} preferences={prefs} />
    </Router>;
    
    render(application, shellElement);
});