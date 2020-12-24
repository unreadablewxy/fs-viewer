import "./index.sass";
import * as React from "react";
import {Icon} from "@mdi/react";
import {mdiTagPlusOutline} from "@mdi/js";

import {ScrollPane} from "../../scroll-pane";

import {Item} from "./item";
import {Input} from "./input";
import {Menu, Item as MenuItem, Divider} from "../../contextual-menu";

export interface Tag {
    id: number;
    label: string;
}

interface RankedTag extends Tag {
    rank: number;
}

function compareRankedTags(a: RankedTag, b: RankedTag): number {
    return a.rank - b.rank || a.label.localeCompare(b.label);
}

function filterTags(
    tags: ReadonlyArray<Tag>,
    searchTerm: string,
): ReadonlyArray<Tag> {
    if (searchTerm) {
        const result = new Array<RankedTag>();
        const term = searchTerm.toLowerCase();
        for (const tag of tags) {
            const position = tag.label.indexOf(term);
            if (position >= 0) {
                result.push({...tag, rank: position});
            }
        }

        return result.sort(compareRankedTags);
    }

    return tags;
}

interface Props {
    tags: Readonly<Tag[]>;
    disabled?: boolean;
    selected: Set<number>;
    onFilterChange: () => void;
    onToggleTag: (tag: TagID) => void;
    onCreateTag: (tag: string) => void;
    onRenameTag: (tag: TagID, newName: string) => void;
    onDeleteTag: (tag: TagID) => void;
    onClearTagCache: (tag: TagID) => void;
}

interface State {
    inputText: string;
    selectedIndex: number;
    forceCreate?: boolean;
    renaming: string | null;
    menu: {x: number, y: number} | null;
}

function offsetToIndex(offset: number, limit: number): number {
    const result = offset % limit;
    return result < 0 ? result + limit : result;
}

export class TagList extends React.PureComponent<Props, State> {
    private readonly focusTagRef: React.RefObject<HTMLLIElement>;
    private readonly inputRef: React.RefObject<HTMLInputElement>;

    constructor(props: Props) {
        super(props);

        this.focusTagRef = React.createRef();
        this.inputRef = React.createRef();

        this.state = {
            inputText: "",
            selectedIndex: 0,
            renaming: null,
            menu: null,
        };

        this.handleClearTagCache = this.handleClearTagCache.bind(this);
        this.handleClickTag = this.handleClickTag.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleInputSubmit = this.handleInputSubmit.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleSelectModeChange = this.handleSelectModeChange.bind(this);
        this.handleTagCursorChange = this.handleTagCursorChange.bind(this);
        this.handleRename = this.handleRename.bind(this);
        this.handleRenameBegin = this.handleRenameBegin.bind(this);
        this.handleRenameEnd = this.handleRenameEnd.bind(this);
    }

    componentDidUpdate(p: Props, s: State): void {
        if (s.selectedIndex !== this.state.selectedIndex) {
            const element = this.focusTagRef.current;
            if (element) {
                const parent = element.offsetParent;
                if (parent) {
                    const box = element.getBoundingClientRect();
                    const parentBox = parent.getBoundingClientRect();
                    if (box.bottom < parentBox.top || box.top > parentBox.bottom)
                        element.scrollIntoView({behavior: "auto"});
                }
            }
        }
    }

    render(): React.ReactNode {
        const {forceCreate, selectedIndex, inputText, menu, renaming} = this.state;
        const searchTerm = inputText.trim();
        const tags = filterTags(this.props.tags, searchTerm);
        const cursorIndex = searchTerm && forceCreate
            ? -1
            : offsetToIndex(selectedIndex, tags.length);

        const {disabled} = this.props;
        const listClassName = disabled ? "tag-picker disabled" : "tag-picker";

        return <>
            <li onMouseDown={this.handleMouseDown}>
                <Input ref={this.inputRef}
                    disabled={disabled}
                    value={inputText}
                    onChange={this.handleInputChange}
                    onSubmit={this.handleInputSubmit}
                    onModeChange={this.handleSelectModeChange}
                    onSelectChange={this.handleTagCursorChange}
                    onRename={this.handleRenameBegin} />
            </li>
            <li className={listClassName} onMouseDown={this.handleMouseDown}>
                <ScrollPane>
                    <ul>
                    {searchTerm && (tags.length < 1 || forceCreate) && (
                        <li className="focus"
                            onClick={() => this.createTag(searchTerm)}
                        >
                            <Icon path={mdiTagPlusOutline} />
                            <span>Create '{searchTerm}'</span>
                        </li>
                    )}
                    {tags.length < 1
                        ? !inputText && <li>No tags found</li>
                        : tags.map(({id, label}, i) => (
                        <Item key={id}
                            ref={i === cursorIndex ? this.focusTagRef : undefined}
                            id={id}
                            index={i}
                            focused={i === cursorIndex}
                            active={this.props.selected.has(id)}
                            renaming={i === cursorIndex ? renaming : null}
                            onClick={this.handleClickTag}
                            onContextMenu={this.handleContextMenu}
                            onRename={this.handleRename}
                            onRenameEnd={this.handleRenameEnd}
                        >
                            {label}
                        </Item>
                    ))}
                    </ul>
                </ScrollPane>
                {menu && <Menu position={menu}>
                    <MenuItem onClick={this.handleRenameBegin}>Rename</MenuItem>
                    <MenuItem onClick={this.handleDelete}>Delete</MenuItem>
                    <Divider />
                    <MenuItem onClick={this.handleClearTagCache}>Clear Tag Cache</MenuItem>
                </Menu>}
            </li>
        </>;
    }

    private createTag(name: string): void {
        this.props.onCreateTag(name);
        this.setState({inputText: ""});
    }

    private getSelectedTag(): Tag | null {
        const searchTerm = this.state.inputText.trim();
        const tags = filterTags(this.props.tags, searchTerm);
        if (tags.length < 1) return null;

        return tags[offsetToIndex(this.state.selectedIndex, tags.length)];
    }

    handleClearTagCache(): void {
        const tag = this.getSelectedTag();
        if (tag) this.props.onClearTagCache(tag.id);

        this.setState({menu: null});
    }

    handleClickTag(id: number): void {
        this.props.onToggleTag(id);
    }

    handleContextMenu(selectedIndex: number, {clientX: x, clientY: y}: React.MouseEvent): void {
        const s = this.state;
        const menu = s.menu && s.selectedIndex === selectedIndex ? null : {x, y};
        this.setState({menu, selectedIndex});
    }

    handleInputChange(inputText: string): void {
        this.props.onFilterChange();
        this.setState({inputText, selectedIndex: 0});
    }

    handleDelete(): void {
        const tag = this.getSelectedTag();
        if (tag) this.props.onDeleteTag(tag.id);

        this.setState({menu: null});
    }

    handleInputSubmit(): void {
        const searchTerm = this.state.inputText.trim();
        const {onToggleTag, tags: unfiltered} = this.props;
        const tags = filterTags(unfiltered, searchTerm);
        if (searchTerm && (tags.length < 1 || this.state.forceCreate)) {
            this.createTag(searchTerm);
        } else if (tags.length > 0) {
            const t = offsetToIndex(this.state.selectedIndex, tags.length);
            onToggleTag(tags[t].id);
        }
    }

    handleMouseDown({button}: React.MouseEvent): void {
        if (this.state.menu && button !== 2)
            this.setState({menu: null});
    }

    handleSelectModeChange(forceCreate: boolean): void {
        this.setState({forceCreate});
    }

    handleTagCursorChange(offset: number): void {
        this.setState(p => ({
            selectedIndex: (p.selectedIndex || 0) + offset,
            renaming: null,
        }));
    }

    handleRenameBegin(): void {
        const tag = this.getSelectedTag();
        if (tag) {
            this.setState({
                renaming: tag.label,
                menu: null,
            });
        }
    }

    handleRename(ev?: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({renaming: ev && ev.target && ev.target.value || ""});
    }

    handleRenameEnd(submit: boolean): void {
        if (submit) {
            const tag = this.getSelectedTag();
            if (tag)
                this.props.onRenameTag(tag.id, this.state.renaming as string);
        }

        this.setState({renaming: null});

        if (this.inputRef.current)
            this.inputRef.current.focus();
    }
}