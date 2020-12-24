import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiTag,
    mdiTagOutline,
} from "@mdi/js";

interface Props {
    ref?: React.Ref<HTMLElement>,
    id: number,
    index: number,
    children: string,
    focused?: boolean,
    active?: boolean,
    renaming: string | null,
    onClick: (id: number) => void,
    onContextMenu: (index: number, ev: React.MouseEvent) => void,
    onRename: (value: React.ChangeEvent<HTMLInputElement>) => void,
    onRenameEnd: (submit: boolean) => void,
}

function renderInput({renaming, onRename, onRenameEnd}: Props) {
    return <input type="text"
        size={1}
        value={renaming || ""}
        onChange={onRename}
        onBlur={() => onRenameEnd(false)}
        onKeyDown={ev => {
            switch (ev.key) {
            case "Enter": onRenameEnd(true); break;
            case "Escape": onRenameEnd(false); break;
            }
            ev.stopPropagation();
        }}
        autoFocus />
}

function renderItem(props: Props, ref?: React.Ref<HTMLElement>): JSX.Element {
    const {id, index, children, focused, active, renaming, onClick, onContextMenu} = props;

    let className = focused ? "focus" : "";
    let clickHandler = undefined;
    let menuHandler = undefined;
    let content: React.ReactNode;

    if (renaming === null) {
        clickHandler = onClick.bind(null, id);
        menuHandler = onContextMenu.bind(null, index);
        content = <span>{children}</span>;
    } else {
        className += " editing";
        content = renderInput(props)
    }

    return <li
        ref={ref as React.Ref<HTMLLIElement>}
        className={className || undefined}
        onClick={clickHandler}
        onContextMenu={menuHandler}
    >
        <Icon path={active ? mdiTag : mdiTagOutline} />
        {content}
    </li>;
}

export const Item = React.memo<Props>(React.forwardRef(renderItem));
