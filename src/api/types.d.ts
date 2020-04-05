interface FilesView {
    /**
     * The path of the directory
     */
    path: string;

    /**
     * Names of files relative to `path`
     */
    names: string[];
}

type NamespaceID = number;

interface TagNamespace {
    /**
     * A magic number that identifies tags translatable by this namespace
     */
    identifier: NamespaceID;

    /**
     * The tags that are available in the directory
     */
    names: Map<number, string>;

    /**
     * The next free to assign to a tag
     */
    nextId: number;
}

type TagID = number;

interface Tags {
    namespace: NamespaceID;
    ids: Set<TagID>;
}

interface OpenDirectoryResult {
    /**
     * The default view
     */
    files: FilesView;

    /**
     * The tags that are available in the directory
     */
    tags: TagNamespace;

    /**
     * Location specific preference overrides (if any)
     */
    preferences: Partial<Preferences>;
}

type Thumbnailer = "none" | "system" | "mapped";

interface Preferences {
    /**
     * Number of columns in grid view
     */
    columns: number;

    /**
     * The ID of the ordering strategy to apply
     */
    order: number;

    /**
     * A choice specific parameter to apply
     */
    orderParam?: string;

    /**
     * The source of thumbnail files
     */
    thumbnail: Thumbnailer;

    /**
     * (if thumbnail is set) the format of the thumbnail path
     */
    thumbnailPath?: string;

    /**
     * How many files to preload in both directions in stage mode
     */
    preload: number;
}

type PreferenceName = keyof Preferences;

type PreferenceNameSet = {[name in PreferenceName]?: 1};

interface Window {
    api: Readonly<API>;
}
