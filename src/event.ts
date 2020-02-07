import * as React from "react";

export function sinkEvent<E extends React.SyntheticEvent>(event: E): void {
    event.stopPropagation();
}
