import * as React from "react";
import {mdiClose, mdiViewGrid, mdiText, mdiTextShort} from "@mdi/js";

import {RadioButtons} from "../radio-buttons";
import {Help} from "../help";
import {NumericInput} from "../number-input";
import {ScopeToggle} from "../scope-toggle";

import {Path} from "./constants";

import type {preference} from "..";

interface PreferenceMappedProps {
    columns: number;
    thumbnail: preference.Thumbnailer;
    thumbnailLabel: preference.ThumbnailLabel,
    thumbnailSizing: preference.ThumbnailSizing;
    thumbnailPath?: string;
    thumbnailResolution?: preference.ThumbnailResolution;
}

interface Props extends PreferenceMappedProps {

    onSetPreferences(values: Partial<preference.Set>): void;

    localPreferences: preference.NameSet;
    onTogglePreferenceScope(name: preference.Name): void;
}

const thumbnailPathHelp = "Supported variables: \
\n  {directory} - The opened directory\
\n  {file-stem} - File name, without extension\
\n  {file-name} - File name, with extension";

const lineupDockingModes: {
    id: preference.ThumbnailLabel, title: string, icon: string
}[] = [
    {
        id: "disable",
        title: "Disable",
        icon: mdiClose,
    },
    {
        id: "full",
        title: "Full",
        icon: mdiText,
    },
    {
        id: "one-line",
        title: "Limited",
        icon: mdiTextShort,
    },
];

export class Menu extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);

        this.handleColumnsChange = this.handleColumnsChange.bind(this);
        this.handleThumbnailerChange = this.handleThumbnailerChange.bind(this);
        this.handleThumbnailLabelChanged = this.handleThumbnailLabelChanged.bind(this);
        this.handleThumbnailPathFormatChanged = this.handleThumbnailPathFormatChanged.bind(this);
        this.handleThumbnailResolutionChanged = this.handleThumbnailResolutionChanged.bind(this);
        this.handleThumbnailSizingChanged = this.handleThumbnailSizingChanged.bind(this);
    }

    toggleColumnsScope = () => this.props.onTogglePreferenceScope("columns");
    toggleThumbnailerScope = () => this.props.onTogglePreferenceScope("thumbnail");
    toggleThumbnailLabelScope = () => this.props.onTogglePreferenceScope("thumbnailLabel");
    toggleThumbnailSizingScope = () => this.props.onTogglePreferenceScope("thumbnailSizing");

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
                    <NumericInput value={columns} min={1} onChange={this.handleColumnsChange} />
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
                    <div>
                        <span>Thumbnail path format</span>
                        <Help>{thumbnailPathHelp}</Help>
                    </div>
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
            <li>
                <label htmlFor="">
                    <div>Thumbnail Label</div>
                    <RadioButtons
                        options={lineupDockingModes}
                        value={this.props.thumbnailLabel}
                        onChange={this.handleThumbnailLabelChanged} />
                </label>
                <ScopeToggle
                    active={"thumbnailLabel" in localPreferences}
                    onClick={this.toggleThumbnailLabelScope} />
            </li>
        </ul>;
    }

    handleColumnsChange(columns: number): void {
        this.props.onSetPreferences({columns});
    }

    handleThumbnailLabelChanged(
        thumbnailLabel: preference.ThumbnailLabel
    ): void {
        this.props.onSetPreferences({thumbnailLabel});
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
        const thumbnailResolution = ev.target.value as preference.ThumbnailResolution;
        this.props.onSetPreferences({thumbnailResolution});
    }

    handleThumbnailerChange(
        ev: React.ChangeEvent<HTMLSelectElement>
    ): void {
        const thumbnail = ev.target.value as preference.Thumbnailer;
        this.props.onSetPreferences({thumbnail});
    }

    handleThumbnailSizingChanged(
        ev: React.ChangeEvent<HTMLSelectElement>
    ): void {
        const thumbnailSizing = ev.target.value as preference.ThumbnailSizing;
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
        thumbnailLabel,
        thumbnailSizing,
        thumbnailPath,
        thumbnailResolution,
    }: preference.Set): PreferenceMappedProps => ({
        columns,
        thumbnail,
        thumbnailLabel,
        thumbnailSizing,
        thumbnailPath,
        thumbnailResolution,
    }),
};