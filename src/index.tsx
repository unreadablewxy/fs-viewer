import "./index.sass"
import {createBrowserHistory} from "history";
import * as React from "react";
import {render} from "react-dom";
import {Router} from "react-router";

import {Shell} from "./shell";

const history = createBrowserHistory();
const application =
    <Router history={history}>
        <Shell api={window.api} />
    </Router>;

render(application, document.getElementById("shell"));