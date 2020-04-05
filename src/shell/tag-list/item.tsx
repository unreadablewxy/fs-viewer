import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiTag,
    mdiTagOutline,
} from "@mdi/js";

interface Props {
    id: number,
    children: React.ReactNode,
    focused?: boolean,
    active?: boolean,
    onClick: (id: number) => void,
    ref?: React.Ref<any>,
}

function renderItem({
    id,
    children,
    focused,
    active,
    onClick,
}: Props, ref?: React.Ref<any>) {
    return <li
        ref={ref}
        className={focused ? "focus" : undefined}
        onClick={onClick.bind(null, id)}
    >
        <Icon path={active ? mdiTag : mdiTagOutline} />
        <span>{children}</span>
    </li>;
}

export const Item = React.memo<Props>(React.forwardRef(renderItem));
