import "./index.sass";
import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiTagPlusOutline,
} from "@mdi/js";

import {Item} from "./item";
import {Input} from "./input";

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

function filterTags(tags: Readonly<Tag[]>, searchTerm: string, selected: Set<number>): Array<Tag> {
    if (searchTerm) {
        let result = new Array<RankedTag>();
        const term = searchTerm.toLowerCase();
        for (const tag of tags) {
            const position = tag.label.indexOf(term);
            if (position >= 0) {
                result.push({...tag, rank: position});
            }
        }

        return result.sort(compareRankedTags);
    }

    const selectedTags = new Array<Tag>();
    const notSelectedTags = new Array<Tag>();
    for (const tag of tags) {
        const isSelected = selected.has(tag.id);
        (isSelected ? selectedTags : notSelectedTags).push(tag);
    }

    return selectedTags.concat(notSelectedTags);
}

interface Props {
    tags: Readonly<Tag[]>;
    selected: Set<number>;
    onToggleTag: (tag: TagID) => void;
    onCreateTag: (tag: string) => void;
}

interface State {
    inputText: string;
    selectedIndex: number;
    forceCreate?: boolean;
}

function offsetToIndex(offset: number, limit: number): number {
    const result = offset % limit;
    return result < 0 ? result + limit : result;
}

export class TagList extends React.PureComponent<Props, State> {
    private readonly focusTagRef: React.RefObject<HTMLLIElement>;

    constructor(props: Props, ...others: unknown[]) {
        super(props, ...others);

        this.focusTagRef = React.createRef();

        this.state = {
            inputText: "",
            selectedIndex: 0,
        };

        this.handleClickTag = this.handleClickTag.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleInputSubmit = this.handleInputSubmit.bind(this);
        this.handleSelectModeChange = this.handleSelectModeChange.bind(this);
        this.handleTagCursorChange = this.handleTagCursorChange.bind(this);
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

    render() {
        const {forceCreate, selectedIndex, inputText} = this.state;
        const searchTerm = inputText.trim();
        const tags = filterTags(this.props.tags, searchTerm, this.props.selected);
        const cursorIndex = searchTerm && forceCreate
            ? -1
            : offsetToIndex(selectedIndex, tags.length);

        return <>
            <li>
                <Input
                    value={inputText}
                    onChange={this.handleInputChange}
                    onSubmit={this.handleInputSubmit}
                    onModeChange={this.handleSelectModeChange}
                    onSelectChange={this.handleTagCursorChange} />
            </li>
            <li className="tag-picker">
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
                        focused={i === cursorIndex}
                        active={this.props.selected.has(id)}
                        onClick={this.handleClickTag}
                    >
                        {label}
                    </Item>
                ))}
                </ul>
            </li>
        </>;
    }

    private createTag(name: string): void {
        this.props.onCreateTag(name);
        this.setState({inputText: ""});
    }

    private handleClickTag(id: number): void {
        this.props.onToggleTag(id);
    }

    handleInputChange(inputText: string): void {
        this.setState({inputText, selectedIndex: 0});
    }

    handleInputSubmit(): void {
        const searchTerm = this.state.inputText.trim();
        const {onToggleTag, selected, tags: unfiltered} = this.props;
        const tags = filterTags(unfiltered, searchTerm, selected);
        if (searchTerm && (tags.length < 1 || this.state.forceCreate)) {
            this.createTag(searchTerm);
        } else if (tags.length > 0) {
            const t = offsetToIndex(this.state.selectedIndex, tags.length);
            onToggleTag(tags[t].id);
        }
    }

    handleSelectModeChange(forceCreate: boolean): void {
        this.setState({forceCreate});
    }

    handleTagCursorChange(offset: number): void {
        this.setState(p => ({selectedIndex: (p.selectedIndex || 0) + offset}));
    }
}