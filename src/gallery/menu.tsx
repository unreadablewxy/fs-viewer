import * as React from "react";
import {mdiViewGrid} from "@mdi/js";

import {ScopeToggle} from "../scope-toggle";

import {Path} from "./constants";

interface PreferenceMappedProps {
    columns: number;
    thumbnail: Thumbnailer;
    thumbnailSizing: ThumbnailSizing;
    thumbnailPath?: string;
    thumbnailResolution?: ThumbnailResolution;
}

interface Props extends PreferenceMappedProps {

    onSetPreferences(values: Partial<Preferences>): void;

    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;
}

export class Menu extends React.PureComponent<Props> {
    private readonly toggleColumnsScope: () => void;
    private readonly toggleThumbnailerScope: () => void;
    private readonly toggleThumbnailSizingScope: () => void;

    constructor(props: Props) {
        super(props);

        this.toggleColumnsScope = () => this.props.onTogglePreferenceScope("columns");
        this.toggleThumbnailerScope = () => this.props.onTogglePreferenceScope("thumbnail");
        this.toggleThumbnailSizingScope = () => this.props.onTogglePreferenceScope("thumbnailSizing");

        this.handleColumnsChange = this.handleColumnsChange.bind(this);
        this.handleThumbnailPathFormatChanged = this.handleThumbnailPathFormatChanged.bind(this);
        this.handleThumbnailResolutionChanged = this.handleThumbnailResolutionChanged.bind(this);
        this.handleThumbnailSizingChanged = this.handleThumbnailSizingChanged.bind(this);
        this.handleThumbnailerChange = this.handleThumbnailerChange.bind(this);
    }

    render(): React.ReactNode {
        const {
            localPreferences,
            columns,
            thumbnail,
            thumbnailSizing,
            thumbnailPath,
            thumbnailResolution,
        } = this.props;

        return <ul className="menu thumbnails">
            <li>
                <label>
                    <div>Columns</div>
                    <input type="number"
                        size={1}
                        value={columns}
                        onChange={this.handleColumnsChange} />
                </label>
                <ScopeToggle
                    active={"columns" in localPreferences}
                    onClick={this.toggleColumnsScope} />
            </li>
            <li>
                <label>
                    <div>Thumbnailer</div>
                    <select
                        value={thumbnail}
                        onChange={this.handleThumbnailerChange}
                    >
                        <option value="system">System</option>
                        <option value="mapped">Mapped</option>
                    </select>
                </label>
                <ScopeToggle
                    active={"thumbnail" in localPreferences}
                    onClick={this.toggleThumbnailerScope} />
            </li>
            {thumbnail === "mapped" && <li>
                <label>
                    <div>Thumbnail path format</div>
                    <input type="text"
                        size={1}
                        value={thumbnailPath}
                        onChange={this.handleThumbnailPathFormatChanged} />
                </label>
            </li>}
            {thumbnail === "system" && <li>
                <label>
                    <div>Thumbnail resolution</div>
                    <select
                        value={thumbnailResolution || "default"}
                        onChange={this.handleThumbnailResolutionChanged}
                    >
                        <option value="default">Default</option>
                        <option value="high">High</option>
                    </select>
                </label>
            </li>}
            <li>
                <label>
                    <div>Thumbnail Sizing</div>
                    <select
                        value={thumbnailSizing}
                        onChange={this.handleThumbnailSizingChanged}
                    >
                        <option value="cover">Cover</option>
                        <option value="full">Show Full</option>
                    </select>
                </label>
                <ScopeToggle
                    active={"thumbnailSizing" in localPreferences}
                    onClick={this.toggleThumbnailSizingScope} />
            </li>
        </ul>;
    }

    handleColumnsChange(ev: React.ChangeEvent<HTMLInputElement>): void {
        const columns = parseInt(ev.target.value);
        this.props.onSetPreferences({columns});
    }

    handleThumbnailPathFormatChanged(
        ev: React.ChangeEvent<HTMLInputElement>
    ): void {
        const thumbnailPath = ev.target.value;
        this.props.onSetPreferences({thumbnailPath});
    }

    handleThumbnailResolutionChanged(
        ev: React.ChangeEvent<HTMLSelectElement>
    ): void {
        const thumbnailResolution = ev.target.value as ThumbnailResolution;
        this.props.onSetPreferences({thumbnailResolution});
    }

    handleThumbnailerChange(
        ev: React.ChangeEvent<HTMLSelectElement>
    ): void {
        const thumbnail = ev.target.value as Thumbnailer;
        this.props.onSetPreferences({thumbnail});
    }

    handleThumbnailSizingChanged(
        ev: React.ChangeEvent<HTMLSelectElement>
    ): void {
        const thumbnailSizing = ev.target.value as ThumbnailSizing;
        this.props.onSetPreferences({thumbnailSizing});
    }
}

export const Definition = {
    id: "thumbnails",
    icon: mdiViewGrid,
    label: "Thumbnails",
    path: [Path],
    requireDirectory: true,
    component: Menu,
    selectPreferences: ({
        columns,
        thumbnail,
        thumbnailSizing,
        thumbnailPath,
        thumbnailResolution,
    }: Preferences): PreferenceMappedProps => ({
        columns,
        thumbnail,
        thumbnailSizing,
        thumbnailPath,
        thumbnailResolution,
    }),
};