import "./lineup.sass";
import * as React from "react";

import {BrowsingService} from "../browsing";
import {Thumbnail} from "../thumbnail";

interface PreferenceMappedProps {
    lineupEntries: number;
    lineupPosition: PanelPosition;
    thumbnailPath?: string;
    thumbnailSizing: ThumbnailSizing;
    thumbnailResolution?: ThumbnailResolution;
}

interface Props extends PreferenceMappedProps {
    browsing: BrowsingService;
}

export class Lineup extends React.PureComponent<Props> {
    constructor(props: Props) {
        super(props);
    }

    componentDidMount(): void {
        this.props.browsing.on("filefocus", this.handleFocusedFileChanged);
        this.props.browsing.on("fileschange", this.handleFilesChanged);
    }

    componentWillUnmount(): void {
        this.props.browsing.off("filefocus", this.handleFocusedFileChanged);
        this.props.browsing.off("fileschange", this.handleFilesChanged);
    }

    render() {
        const {files, selected} = this.props.browsing;
        const adjacents = this.props.lineupEntries;

        const focusedFile = this.props.browsing.focusedFile || 0;
        let firstDrawn: number;
        let lastDrawn: number;
        if (focusedFile <= adjacents) {
            firstDrawn = 0;
            lastDrawn = Math.min(files.names.length - 1, 2 * adjacents);
        } else if (files.names.length - 1 - focusedFile < adjacents) {
            lastDrawn = files.names.length - 1;
            firstDrawn = Math.max(0, files.names.length - 2 * adjacents - 1);
        } else {
            firstDrawn = focusedFile - adjacents;
            lastDrawn = focusedFile + adjacents;
        }

        const names = files.names.slice(firstDrawn, lastDrawn + 1);

        return <div className={`lineup dock-${this.props.lineupPosition}`}>
            <ul>
            {names.map((_, i) => {
                const index = i + firstDrawn;

                return <Thumbnail key={index}
                    files={files}
                    index={index}
                    anchor={index === focusedFile}
                    selected={selected?.has(index) || false}
                    pathFormat={this.props.thumbnailPath}
                    thumbnailResolution={this.props.thumbnailResolution}
                    onClick={this.props.browsing.setFocus} />
            })}
            </ul>
        </div>;
    }

    handleFocusedFileChanged = (fileIndex: number | null): void => {
        this.forceUpdate();
    };

    handleFilesChanged = () => {
        this.forceUpdate();
    };
}