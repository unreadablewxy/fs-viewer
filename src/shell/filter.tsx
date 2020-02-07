import "./filter.sass";
import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiTag,
    mdiTagOutline,
    mdiTagPlusOutline,
} from "@mdi/js";

import {FilterTagSearch} from "./filter-tag-search";

export function filterFiles(
    unfiltered: FilesView,
    filters: ReadonlyArray<Set<string>>,
): FilesView {
    if (filters.length < 1)
        return unfiltered;

    const {path, names} = unfiltered;
    const result: FilesView = {
        path,
        names: [],
    };

    for (let i = 0; i < names.length; ++i) {
        const name = names[i];

        let passed = true;
        for (let j = filters.length; passed && j --> 0;)
            passed = filters[j].has(name);

        if (passed)
            result.names.push(name);
    }

    return result;
}

interface Props {
    api: API;
    directory?: string;
    file?: string;
    tags: TagNamespace;
    filteringTags: Set<number>;
    onToggleTag: (tag: TagID) => void;
    onCreateTag: (tag: string) => Promise<TagID>;
}

interface State {
    searchText: string;
    selectedIndex: number;
    forceCreate?: boolean;

    fileTags: Tags;
}

const noTags = { namespace: 0, ids: new Set<number>() };

type TagChoice = [number, string];

function compareChoices([_1, a]: TagChoice, [_2, b]: TagChoice): number {
    return a.localeCompare(b);
}

type TagChoiceRanked = [number, string, number];

function compareChoicesRanked(
    [_1, a, ar]: TagChoiceRanked,
    [_2, b, br]: TagChoiceRanked,
): number {
    return ar - br || a.localeCompare(b);
}

function filterTags(ns: TagNamespace, searchText: string): Array<TagChoice> {
    if (searchText) {
        let result = new Array<TagChoiceRanked>();
        const term = searchText.toLowerCase();
        for (const entry of ns.names) {
            const position = entry[1].indexOf(term);
            if (position >= 0) {
                entry.push(position);
                result.push(entry as unknown as TagChoiceRanked);
            }
        }

        return result.sort(compareChoicesRanked) as unknown as Array<TagChoice>;
    }

    return [...ns.names.entries()].sort(compareChoices);
}

function offsetToIndex(offset: number, limit: number): number {
    const result = offset % limit;
    return result < 0 ? result + limit : result;
}

export class Filter extends React.PureComponent<Props, State> {
    private readonly focusTagRef: React.RefObject<HTMLLIElement>;

    constructor(props: Props, context: any) {
        super(props, context);

        this.focusTagRef = React.createRef();

        this.state = {
            searchText: "",
            selectedIndex: 0,
            fileTags: noTags,
        };

        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handleSearchSubmit = this.handleSearchSubmit.bind(this);
        this.handleSelectModeChange = this.handleSelectModeChange.bind(this);
        this.handleTagCursorChange = this.handleTagCursorChange.bind(this);
    }

    componentDidMount(): void {
        const {file, directory} = this.props;
        if (file && directory)
            this.loadFileTags(directory, file);
    }

    componentDidUpdate(p: Props, s: State): void {
        const {file, directory} = this.props;
        if (file !== p.file || directory !== p.directory)
            if (file && directory)
                this.loadFileTags(directory, file);

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
        const {file} = this.props;
        const {selectedIndex} = this.state;

        const searchText = this.state.searchText.trim();
        let tags = filterTags(this.props.tags, searchText);

        const forceCreate = this.state.forceCreate && searchText;
        const focusTagIndex = forceCreate ? -1 : offsetToIndex(selectedIndex, tags.length);

        const tagStateLookup = file ? this.state.fileTags.ids : this.props.filteringTags;

        return <ul className="menu filter">
            <li>
                <FilterTagSearch
                    value={this.state.searchText}
                    onChange={this.handleSearchChange}
                    onSubmit={this.handleSearchSubmit}
                    onModeChange={this.handleSelectModeChange}
                    onSelectChange={this.handleTagCursorChange} />
            </li>
            <li className="tag-picker">
                <ul>
                {searchText && (tags.length < 1 || forceCreate) && (
                    <li className="focus"
                        onClick={() => this.createTag(searchText)}
                    >
                        <Icon path={mdiTagPlusOutline} />
                        <span>Create '{searchText}'</span>
                    </li>
                )}
                {tags.length < 1
                    ? !searchText && <li>No tags found</li>
                    : tags.map((t, i) => (
                    <li key={t[0]}
                        ref={i === focusTagIndex ? this.focusTagRef : undefined}
                        className={i === focusTagIndex ? "focus" : undefined}
                        onClick={() => this.handleClickTag(t[0])}
                    >
                        <Icon path={(tagStateLookup.has(t[0]) ? mdiTag : mdiTagOutline)} />
                        <span>{t[1]}</span>
                    </li>
                ))}
                </ul>
            </li>
        </ul>;
    }

    private createTag(name: string): void {
        const {directory, file} = this.props;
        const task = this.props.onCreateTag(name);
        if (file && directory)
            task.then(id => {
                const p = this.props;
                if (file === p.file && directory === p.directory) {
                    const fileTags: Tags = {
                        namespace: p.tags.identifier,
                        ids: new Set<number>(this.state.fileTags?.ids),
                    };

                    fileTags.ids.add(id);
                    this.setState({searchText: "", fileTags});

                    p.api.saveFileTagIDs(directory, file, fileTags, [id]);
                }
            });
    }

    private handleClickTag(id: number): void {
        const {directory, file} = this.props;
        if (file && directory) {
            this.setState(
                (s, p) => {
                    // Check if the namespace is relevant
                    if (s.fileTags && p.tags.identifier !== s.fileTags.namespace)
                        return null;

                    const fileTags: Tags = {
                        namespace: p.tags.identifier,
                        ids: new Set<number>(s.fileTags?.ids),
                    };

                    if (fileTags.ids.has(id))
                        fileTags.ids.delete(id);
                    else
                        fileTags.ids.add(id)

                    const tagsToSave = fileTags.ids.size > 0 ? fileTags : null;
                    p.api.saveFileTagIDs(directory, file, tagsToSave, [id]);
                    return {fileTags};
                });
        } else {
            this.props.onToggleTag(id);
        }
    }

    private loadFileTags(directory: string, file: string) {
        this.props.api.loadFileTagIDs(directory, file).then(
            fileTags => this.setState((_, p) => {
                if (p.file !== file || p.directory !== directory)
                    return null;
                    
                if (!fileTags)
                    fileTags = {
                        namespace: this.props.tags.identifier,
                        ids: new Set<number>(),
                    };

                return {fileTags};
            }));
    }

    handleSearchChange(searchText: string): void {
        this.setState({searchText, selectedIndex: 0});
    }

    handleSearchSubmit(): void {
        const searchText = this.state.searchText.trim();
        const tags = filterTags(this.props.tags, searchText);
        if (searchText && (tags.length < 1 || this.state.forceCreate)) {
            // No tags, how about a file that can be tagged?
            this.createTag(searchText);
        } else if (tags.length > 0) {
            const t = offsetToIndex(this.state.selectedIndex, tags.length);
            this.handleClickTag(tags[t][0]);
        }
    }

    handleSelectModeChange(forceCreate: boolean): void {
        this.setState({forceCreate});
    }

    handleTagCursorChange(offset: number): void {
        this.setState(p => ({selectedIndex: (p.selectedIndex || 0) + offset}));
    }
}