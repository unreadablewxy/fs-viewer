import "./radio-buttons.sass";
import * as React from "react";
import {Icon} from "@mdi/react";

export interface Option<T extends string | number> {
    id: T;
    title: string;
    icon: string;
}

export function Component<T extends string | number>({
    options,
    value,
    onChange,
}: {
    options: Option<T>[], 
    value: T,
    onChange(value: T): void,
}) {
    return <div className="radio-buttons">
        {options.map(v => <button key={v.id}
            className={value === v.id ? "active" : undefined}
            title={v.title}
            onClick={() => onChange(v.id)}>
                <Icon path={v.icon} />
            </button>)}
    </div>;
}

export const RadioButtons = React.memo(Component);