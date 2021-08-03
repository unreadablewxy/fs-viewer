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

interface OpenDirectoryResult {
    /**
     * The default view
     */
    files: FilesView;

    /**
     * Location specific preference overrides (if any)
     */
    preferences: Partial<Preferences>;
}

type Thumbnailer = "none" | "system" | "mapped";

type ThumbnailSizing = "cover" | "full";

type ThumbnailResolution = "default" | "high";

type PanelPosition = "left" | "right" | "bottom" | "disable";

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
     * Resolution of thumbnails generated from the system thumbnailer
     */
    thumbnailResolution?: ThumbnailResolution;

    /**
     * How thumbnail images are sized
     */
    thumbnailSizing: ThumbnailSizing;

    /**
     * How many files to preload in both directions in stage mode
     */
    preload: number;

    /**
     * The names of extensions to use
     */
    extensions: string[];

    /**
     * The position where the image lineup is docked
     */
    lineupPosition: PanelPosition;

    /**
     * The number of files to include in either directions
     */
    lineupEntries: number;
}

type PreferenceName = keyof Preferences;

type PreferenceNameSet = {[name in PreferenceName]?: 1};