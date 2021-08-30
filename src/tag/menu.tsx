import * as React from "react";
import {createSelector} from "reselect";
import {BuiltinNamespace} from "inconel";
import {mdiAlertCircle, mdiTag, mdiTagMultiple} from "@mdi/js";

import {MenuSpecificProps} from "../extension";
import {Path as GalleryPath} from "../gallery";
import {Notice, Level} from "../notice";
import {Path as StagePath} from "../stage";

import {TagFilter, TagFilterConfig, isTagFilter, UntaggedID} from "./filter";
import {TagList, Tag} from "./list";
import {ProgressService} from "../progress";

import type {browsing, tag} from "..";

const mapFiltersToSelectedTagsMemoized = createSelector(
    (filters: ReadonlyArray<browsing.FilterConfig>) => filters,
    (filters: ReadonlyArray<browsing.FilterConfig>): Set<number> => {
        const result = new Set<number>();
        for (let n = filters.length; n --> 0;) {
            const filter = filters[n];
            if (isTagFilter(filter))
                result.add(filter.tag);
        }

        return result;
    });

function compareTags(a: Tag, b: Tag): number {
    return a.label.localeCompare(b.label);
}

interface Props extends MenuSpecificProps {
    browsing: browsing.Service;
    tagging: tag.Service;
    progress: ProgressService;
}

interface State {
    selectedTags: tag.Tags;
    loaded: string | null;
}

const noTags = Object.freeze({ namespace: 0, ids: new Set<number>() });
const noTagsList: Tag[] = [];
const noSelection = new Set<number>();

export class Filter extends React.PureComponent<Props, State> {
    private tags: Tag[] | null = null;

    constructor(props: Props) {
        super(props);

        this.state = {
            selectedTags: noTags,
            loaded: null,
        };

        this.handleToggleTag = this.handleToggleTag.bind(this);
        this.handleCreateTag = this.handleCreateTag.bind(this);
        this.handleFileFocus = this.handleFileFocus.bind(this);
        this.handleFileTagChange = this.handleFileTagChange.bind(this);
        this.handleFilterCleared = this.handleFilterCleared.bind(this);
        this.handleNamespaceChange = this.handleNamespaceChange.bind(this);
        this.handleDirectoryChange = this.handleDirectoryChange.bind(this);
    }

    /**
     * @return The name of the file that has been selected for editing tags
     */
    private getSelectedFile(): string | null {
        // TODO: Find a better way to convey current mode's read-only intentions
        const {files, focusedFile} = this.props.browsing;
        if ((!focusedFile && focusedFile !== 0) || this.props.path === GalleryPath)
            return null;

        return files.names[focusedFile];
    }

    componentDidMount(): void {
        this.props.browsing.on("filefocus", this.handleFileFocus);
        this.props.browsing.on("fileschange", this.handleDirectoryChange);
        this.props.tagging.on("filechange", this.handleFileTagChange);
        this.props.tagging.on("change", this.handleNamespaceChange);

        this.handleFileFocus(this.props.browsing.focusedFile);
    }

    componentWillUnmount(): void {
        this.props.browsing.off("filefocus", this.handleFileFocus);
        this.props.browsing.off("fileschange", this.handleDirectoryChange);
        this.props.tagging.off("filechange", this.handleFileTagChange);
        this.props.tagging.off("change", this.handleNamespaceChange);
    }

    render(): React.ReactNode {
        let loading: boolean | undefined;
        let tags: ReadonlyArray<Tag>;
        let selected: Set<number>;
        let fault: string | undefined;

        const browsingService = this.props.browsing;
        const selectedFiles = browsingService.selected.size;

        const file = this.getSelectedFile();
        if (file) {
            loading = file !== this.state.loaded;
            if (loading) {
                tags = noTagsList;
                selected = noSelection;
            } else if (this.props.tagging.namespace === this.state.selectedTags.namespace) {
                tags = this.getTags();
                selected = this.state.selectedTags.ids;
            } else {
                fault = "Can't change this file.\nIt appears to be from a\n" +
                    `different namespace\n(id: ${this.state.selectedTags.namespace})`;

                tags = Array.from(this.state.selectedTags.ids.values()).sort()
                    .map(id => ({id, label: `(Unknown tag #${id})`}));

                selected = this.state.selectedTags.ids;
            }
        } else {
            tags = this.getTags();
            if (selectedFiles) {
                selected = this.state.selectedTags.ids;
            } else {
                selected = mapFiltersToSelectedTagsMemoized(browsingService.filters);
            }
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
            {!!selectedFiles && !file && <li>
                <Notice level={Level.Info}
                    icon={mdiTagMultiple}
                    title="Batch Tagging"
                >
                    <pre>Tagging {selectedFiles} files</pre>
                </Notice>
            </li>}
            {!loading && <TagList
                tags={tags}
                disabled={!!fault}
                selected={selected}
                onFilterCleared={this.handleFilterCleared}
                onToggleTag={this.handleToggleTag}
                onCreateTag={this.handleCreateTag}
                onRenameTag={this.props.tagging.renameTag}
                onDeleteTag={this.props.tagging.deleteTag}
            />}
        </ul>;
    }

    private getTags(): ReadonlyArray<Tag> {
        if (!this.tags) {
            const selected = new Array<Tag>();
            const unselected = new Array<Tag>();

            const selectedIds = this.getSelectedFile()
                ? this.state.selectedTags.ids
                : mapFiltersToSelectedTagsMemoized(this.props.browsing.filters);

            for (const [id, label] of this.props.tagging.names)
                (selectedIds.has(id) ? selected : unselected).push({id, label});

            selected.sort(compareTags);
            unselected.sort(compareTags);

            if (this.props.path !== StagePath)
                selected.unshift({id: UntaggedID, label: "(Untagged)"});

            this.tags = selected.concat(unselected);
        }

        return this.tags;
    }

    // TODO: Batch tagging shouldn't use the toggling approach, remove this when
    // the UI change is implemented
    private onBatchTaggingComplete(tag: tag.ID, clearing: boolean): void {
        this.setState(({selectedTags, loaded}) => {
            if (loaded != null)
                return null;

            const ids = new Set(selectedTags.ids);
            if (clearing)
                ids.delete(tag);
            else
                ids.add(tag);

            return {
                selectedTags: {
                    ids,
                    namespace: selectedTags.namespace,
                },
            };
        });
    }

    async handleCreateTag(name: string): Promise<void> {
        const tagID = await this.props.tagging.createTag(name);
        const file = this.getSelectedFile();
        if (file) {
            await this.props.tagging.assignTag(tagID, [file]);
            this.tags = null;
            this.forceUpdate();
            return;
        }

        const selected = this.props.browsing.getSelectedNames();
        if (selected) {
            await this.props.tagging.assignTag(tagID, selected);
            this.onBatchTaggingComplete(tagID, false);
        }
    }

    async handleToggleTag(tag: tag.ID): Promise<void> {
        const file = this.getSelectedFile();
        if (file)
            return this.props.tagging.toggleFileTag(tag, file);

        const selected = this.props.browsing.getSelectedNames();
        if (selected) {
            const clearing = this.state.selectedTags.ids.has(tag);
            if (clearing)
                await this.props.tagging.clearTag(tag, selected);
            else
                await this.props.tagging.assignTag(tag, selected);

            this.onBatchTaggingComplete(tag, clearing);
            return;
        }

        const filters = this.props.browsing.filters;
        for (let n = filters.length; n --> 0;) {
            const filter = filters[n];
            if (isTagFilter(filter) && filter.tag === tag) {
                this.props.browsing.removeFilter((filter as unknown as browsing.Filter).id as number);
                return;
            }
        }

        const task = this.props.browsing.addFilter({
            type: TagFilter.TypeID,
            namespace: this.props.tagging.namespace,
            tag,
        } as TagFilterConfig);

        this.props.progress.set("tagging", task, `${BuiltinNamespace}.${Definition.id}`);
    }

    private handleFileFocus(index: number | null): void {
        if (index !== null && this.props.path !== GalleryPath) {
            const file = this.props.browsing.files.names[index];
            this.props.tagging.getTags(file).then(selectedTags => {
                if (this.getSelectedFile() === file) {
                    this.tags = null;
                    this.setState({
                        loaded: file,
                        selectedTags,
                    });
                }
            });
        }
    }

    private async handleFileTagChange(fileName: string, selectedTags: tag.Tags): Promise<void> {
        if (fileName === this.getSelectedFile())
            this.setState({selectedTags});
    }

    private handleNamespaceChange(): void {
        // Tag namespace changes means either new tags are created or existing
        // tags are deleted, we must reorder the list
        this.tags = null;
        this.forceUpdate();
    }

    private handleDirectoryChange(): void {
        // Files change could be a result of tag based filtering for which we
        // must update the list but not necessarily reorder it
        this.forceUpdate();
    }

    private handleFilterCleared(): void {
        // Filter means tag list filter, this is an opportunity to reorder the
        // tags list so that the new selected elements are moved to the top
        this.tags = null;
        this.forceUpdate();
    }
}

export const Definition = {
    id: "tagging",
    icon: mdiTag,
    label: "Tagging",
    path: [GalleryPath, StagePath],
    requireDirectory: true,
    services: ["browsing", "tagging", "progress"],
    component: Filter,
};
