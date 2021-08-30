import "./help.sass";
import * as React from "react";
import {mdiInformation} from "@mdi/js";
import Icon from "@mdi/react";

interface Props {
    children: string;
}

export function Help({children}: Props) {
    const [open, setOpen] = React.useState(false);

    const className = open ? "tooltip active" : "tooltip";
    return <span onClick={() => setOpen(!open)} className={className}>
        <Icon path={mdiInformation} />
        <pre>{children}</pre>
    </span>;
}