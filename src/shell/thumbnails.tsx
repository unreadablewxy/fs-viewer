import * as React from "react";
import {ScopeToggle} from "./scope-toggle";

interface Props {
    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;

    columns: number;
    onColsChanged(cols: number): void;

    thumbnailer: Thumbnailer;
    onThumbnailerChanged(thumbnailer: Thumbnailer): void;

    thumbnailPathFormat?: string;
    onThumbnailPathFormatChanged(format: string): void;

    thumbnailResolution?: ThumbnailResolution;
    onThumbnailResolutionChanged: (resolution: ThumbnailResolution) => void;

    thumbnailSizing: string;
    onThumbnailSizingChanged(sizing: ThumbnailSizing): void;
}

export class Thumbnails extends React.PureComponent<Props> {
    private readonly toggleColumnsScope: () => void;
    private readonly toggleThumbnailerScope: () => void;
    private readonly toggleThumbnailSizingScope: () => void;

    constructor(props: Props, context: any) {
        super(props, context);

        this.toggleColumnsScope = () => this.props.onTogglePreferenceScope("columns");
        this.toggleThumbnailerScope = () => this.props.onTogglePreferenceScope("thumbnail");
        this.toggleThumbnailSizingScope = () => this.props.onTogglePreferenceScope("thumbnailSizing");

        this.handleColumnsChange = this.handleColumnsChange.bind(this);
        this.handleThumbnailPathFormatChanged = this.handleThumbnailPathFormatChanged.bind(this);
        this.handleThumbnailResolutionChanged = this.handleThumbnailResolutionChanged.bind(this);
        this.handleThumbnailSizingChanged = this.handleThumbnailSizingChanged.bind(this);
        this.handleThumbnailerChange = this.handleThumbnailerChange.bind(this);
    }

    public render() {
        const {
            localPreferences,
            columns,
            thumbnailer,
            thumbnailSizing,
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
                        value={thumbnailer}
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
            {thumbnailer === "mapped" && <li>
                <label>
                    <div>Thumbnail path format</div>
                    <input type="text"
                        size={1}
                        value={this.props.thumbnailPathFormat}
                        onChange={this.handleThumbnailPathFormatChanged} />
                </label>
            </li>}
            {thumbnailer === "system" && <li>
                <label>
                    <div>Thumbnail resolution</div>
                    <select
                        value={this.props.thumbnailResolution || "default"}
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

    private handleColumnsChange(ev: React.ChangeEvent<HTMLInputElement>): void {
        this.props.onColsChanged(parseInt(ev.target.value));
    }

    private handleThumbnailPathFormatChanged(
        ev: React.ChangeEvent<HTMLInputElement>
    ): void {
        this.props.onThumbnailPathFormatChanged(ev.target.value);
    }

    private handleThumbnailResolutionChanged(
        ev: React.ChangeEvent<HTMLSelectElement>
    ): void {
        this.props.onThumbnailResolutionChanged(ev.target.value as ThumbnailResolution);
    }

    private handleThumbnailerChange(
        ev: React.ChangeEvent<HTMLSelectElement>
    ): void {
        this.props.onThumbnailerChanged(ev.target.value as Thumbnailer);
    }

    private handleThumbnailSizingChanged(
        ev: React.ChangeEvent<HTMLSelectElement>
    ): void {
        this.props.onThumbnailSizingChanged(ev.target.value as ThumbnailSizing);
    }
}