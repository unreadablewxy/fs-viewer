import * as React from "react";
import {createSelector} from "reselect";
import {mdiAlertCircle, mdiTagMultiple} from "@mdi/js";

import {TagList, Tag} from "./tag-list";
import {Notice, Level} from "../notice";

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

function compareTags(a: Tag, b: Tag): number {
    return a.label.localeCompare(b.label);
}

const convertTagMapToListMemoized = createSelector(
    (props: Props, state: State) => props.tags.names,
    (props: Props, state: State) => !props.file && !props.batchSize,
    (props: Props, state: State) => state.initialTags,
    (
        lookup: Map<number, string>,
        filtering: boolean,
        chosen: Set<number>,
    ): Tag[] => {
        let selected = new Array<Tag>();
        let unselected = new Array<Tag>();
        for (const [id, label] of lookup)
            (chosen.has(id) ? selected : unselected).push({id, label});
    
        selected.sort(compareTags);
        unselected.sort(compareTags);
    
        if (filtering)
            selected.unshift({id: -1, label: "(Untagged)"});
    
        return selected.concat(unselected);
    });

interface Props {
    api: API;
    directory: string;
    file?: string;
    batchSize?: number;
    tags: TagNamespace;
    selectedTags: Set<number>;
    onToggleTag: (tag: TagID) => void;
    onCreateTag: (tag: string) => Promise<TagID>;
    onRenameTag: (id: TagID, newName: string) => void;
    onDeleteTag: (tag: TagID) => Promise<void>;
}

type FileID = string;

interface State {
    fileTags: Tags;
    initialTags: Set<number>;
    fileLoaded: FileID | null;
}

const noTags = { namespace: 0, ids: new Set<number>() };
const noTagsList: Tag[] = [];
const noSelection = new Set<number>();

function getFileID(directory: string, file: string): FileID {
    return `${directory}\n${file}`;
}

export class Filter extends React.PureComponent<Props, State> {
    constructor(props: Props, ...others: unknown[]) {
        super(props, ...others);

        this.state = {
            fileTags: noTags,
            initialTags: props.file ? noTags.ids : props.selectedTags,
            fileLoaded: null,
        };

        this.handleToggleTag = this.handleToggleTag.bind(this);
        this.handleCreateTag = this.handleCreateTag.bind(this);
        this.handleClearTagCache = this.handleClearTagCache.bind(this);
        this.resortTags = this.resortTags.bind(this);
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
    }

    render() {
        let loading: boolean | undefined;
        let tags: Tag[];
        let selected: Set<number>;
        let fault: string | undefined;

        const {batchSize, directory, file} = this.props;
        if (file) {
            loading = getFileID(directory, file) != this.state.fileLoaded;
            if (loading) {
                tags = noTagsList;
                selected = noSelection;
            } else if (this.props.tags.identifier === this.state.fileTags.namespace) {
                tags = convertTagMapToListMemoized(this.props, this.state);
                selected = this.state.fileTags.ids;
            } else {
                fault = "Can't change this file.\nIt appears to be from a\n" +
                    `different namespace\n(id: ${this.props.tags.identifier})`;

                tags = Array.from(this.state.fileTags.ids.values()).sort()
                    .map(id => ({id, label: `(Unknown tag #${id})`}));

                selected = this.state.fileTags.ids;
            }
        } else { 
            tags = convertTagMapToListMemoized(this.props, this.state);
            selected = this.props.selectedTags;
        }

        return <ul className="menu filter">
            {fault && <li>
                <Notice level={Level.Error}
                    icon={mdiAlertCircle}
                    title="Error"
                >
                    <pre>{fault}</pre>
                </Notice>
            </li>}
            {!!batchSize && !file && <li>
                <Notice level={Level.Info}
                    icon={mdiTagMultiple}
                    title="Batch Tagging"
                >
                    <pre>Tagging multiple files</pre>
                </Notice>
            </li>}
            {!loading && <TagList
                tags={tags}
                disabled={loading || !!fault}
                selected={selected}
                onFilterChange={this.resortTags}
                onToggleTag={this.handleToggleTag}
                onCreateTag={this.handleCreateTag}
                onRenameTag={this.props.onRenameTag}
                onDeleteTag={this.props.onDeleteTag}
                onClearTagCache={this.handleClearTagCache}
            />}
        </ul>;
    }

    handleClearTagCache(tag: TagID): void {
        this.props.api.clearTagIndex(this.props.directory, tag);
    }

    handleCreateTag(name: string): void {
        const {directory, file, batchSize} = this.props;
        const task = this.props.onCreateTag(name);
        if (directory) {
            if (file) {
                task.then(id => {
                    const p = this.props;
                    if (file === p.file && directory === p.directory) {
                        const fileTags: Tags = {
                            namespace: p.tags.identifier,
                            ids: new Set<number>(this.state.fileTags?.ids),
                        };

                        fileTags.ids.add(id);
                        this.setState({fileTags})

                        p.api.saveFileTagIDs(directory, file, fileTags, [id]);
                    }
                });
            } else if (batchSize) {
                task.then(this.props.onToggleTag);
            }
        }
    }

    handleToggleTag(id: TagID): void {
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

    private loadFileTags(directory: string, file: string): void {
        this.props.api.loadFileTagIDs(directory, file).then(
            fileTags => this.setState((_, p) => {
                if (p.file !== file || p.directory !== directory)
                    return null;
                    
                if (!fileTags)
                    fileTags = {
                        namespace: this.props.tags.identifier,
                        ids: new Set<number>(),
                    };

                return {
                    fileTags,
                    initialTags: fileTags.ids,
                    fileLoaded: getFileID(directory, file),
                };
            }));
    }

    private resortTags(): void {
        const tags = this.props.file
            ? this.state.fileTags.ids
            : this.props.selectedTags

        this.setState({initialTags: tags});
    }
}