import * as React from "react";
import {createSelector} from "reselect";

import {TagList, Tag} from "./tag-list";

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

function convertTagMapToList(lookup: Map<number, string>): Tag[] {
    let result = new Array<Tag>(lookup.size);
    let n = 0;
    for (const [id, label] of lookup)
        result[n++] = {id, label};

    return result.sort(compareTags);
}

const convertTagMapToListMemoized = createSelector<
    Props,
    Map<number, string>,
    Tag[]
>(props => props.tags.names, convertTagMapToList);

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
    fileTags: Tags;
}

const noTags = { namespace: 0, ids: new Set<number>() };

export class Filter extends React.PureComponent<Props, State> {
    constructor(props: Props, ...others: unknown[]) {
        super(props, ...others);

        this.state = {
            fileTags: noTags,
        };

        this.handleToggleTag = this.handleToggleTag.bind(this);
        this.handleCreateTag = this.handleCreateTag.bind(this);
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
        const {file} = this.props;
        const selected = file ? this.state.fileTags.ids : this.props.filteringTags;
        const tags = convertTagMapToListMemoized(this.props);

        return <ul className="menu filter">
            <TagList
                tags={tags}
                selected={selected}
                onToggleTag={this.handleToggleTag}
                onCreateTag={this.handleCreateTag} />
        </ul>;
    }

    handleCreateTag(name: string): void {
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
                    this.setState({fileTags})

                    p.api.saveFileTagIDs(directory, file, fileTags, [id]);
                }
            });
    }

    handleToggleTag(id: number): void {
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
}