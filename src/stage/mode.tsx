import "./stage.sass";
import * as React from "react";

import {Center} from "./center";
import {Path} from "./constants";
import {Lineup} from "./lineup";
import {TransitionService} from "./transition-service";

import type {browsing, preference} from "..";

interface PreferenceMappedProps {
    lineupEntries: number;
    lineupPosition: preference.PanelPosition;
    preload: number;
    thumbnailPath?: string;
    thumbnailSizing: preference.ThumbnailSizing;
    thumbnailResolution?: preference.ThumbnailResolution;
}

interface Props extends PreferenceMappedProps {
    browsing: browsing.Service;
    transition: TransitionService;

    showActualSize: boolean;
}

interface State {
    fileType?: string;
}

const videoFileSuffices = new Set(["avi", "mkv", "mp4", "mov", "webm"]);

function loadImage(files: browsing.FilesView, index: number): HTMLImageElement {
    const image = document.createElement("img");
    image.src = `file://${files.path}/${files.names[index]}`;
    return image;
}

export class Stage extends React.PureComponent<Props, State> {
    preloadedImages: Array<HTMLImageElement> = [];

    private container: React.RefObject<HTMLElement>;

    private probeRequestController?: AbortController;

    constructor(props: Props) {
        super(props);

        this.state = {};

        this.container = React.createRef<HTMLElement>();

        this.handleFocusedFileChanged = this.handleFocusedFileChanged.bind(this);
        this.handleImageError = this.handleImageError.bind(this);
        this.handleKeyDownShell = this.handleKeyDownShell.bind(this);
        this.handleScalingChange = this.handleScalingChange.bind(this);
        this.handleTransition = this.handleTransition.bind(this);
        this.navigateNext = this.navigateNext.bind(this);
        this.navigatePrev = this.navigatePrev.bind(this);
    }

    componentDidMount(): void {
        this.props.browsing.on("filefocus", this.handleFocusedFileChanged);
        this.props.transition.on("transition", this.handleTransition);
        this.props.transition.on("scalingchange", this.handleScalingChange);

        (this.container.current as HTMLElement).focus();
    }

    componentWillUnmount(): void {
        this.props.browsing.off("filefocus", this.handleFocusedFileChanged);
        this.props.transition.off("transition", this.handleTransition);
        this.props.transition.off("scalingchange", this.handleScalingChange);
    }

    render(): React.ReactNode {
        const {files, focusedFile} = this.props.browsing;
        const fileIndex = focusedFile || 0;

        const {fileType} = this.state;
        const fileName = files.names[fileIndex];

        const suffixIndex = fileName.lastIndexOf('.');
        let isVideo = false;
        if (suffixIndex > 0) {
            isVideo = videoFileSuffices.has(fileName.slice(suffixIndex + 1));
        } else if (fileType) {
            isVideo = fileType.startsWith("video/");
        }

        const fileUrl = `file://${files.path}/${fileName}`;
        let cssClass = this.props.transition.scaleToFit ? "stage fit" : "stage";

        const {lineupPosition} = this.props;
        if (lineupPosition === "bottom")
            cssClass += " lineup-docked";

        const lineup = <Lineup
            key="lineup"
            lineupEntries={this.props.lineupEntries}
            lineupPosition={this.props.lineupPosition}
            browsing={this.props.browsing}
            thumbnailSizing={this.props.thumbnailSizing}
            thumbnailResolution={this.props.thumbnailResolution}
            thumbnailPath={this.props.thumbnailPath}
        />;

        return <section className={cssClass}
            tabIndex={1}
            ref={this.container}
            onKeyDown={this.handleKeyDownShell}
        >
            {(lineupPosition === "left" || lineupPosition === "right") && lineup}
            <Center key={fileName}
                atStart={fileIndex <= 0}
                atEnd={fileIndex >= files.names.length - 1}
                onNavigateNext={this.navigateNext}
                onNavigatePrev={this.navigatePrev}
            >
                {isVideo
                    ? <video src={fileUrl} controls />
                    : <img src={fileUrl}
                        alt={fileName}
                        onError={this.handleImageError} />}
            </Center>
            {lineupPosition === "bottom" && lineup}
        </section>;
    }

    navigatePrev(): void {
        const {focusedFile, setFocus} = this.props.browsing;
        if (focusedFile !== null && focusedFile > 0)
            setFocus(focusedFile - 1)
    }

    navigateNext(): boolean {
        const {focusedFile, setFocus, files} = this.props.browsing;
        if (focusedFile !== null) {
            const canNavigate = focusedFile < files.names.length - 1;
            canNavigate && setFocus(focusedFile + 1);
            return canNavigate;
        }

        return false;
    }

    handleImageError(): void {
        const {files, focusedFile} = this.props.browsing;
        if (focusedFile === null)
            return;

        this.probeRequestController = new AbortController();
        const url = `file://${files.path}/${files.names[focusedFile]}`;
        fetch(url, {
            method: "HEAD",
            cache: "default",
            redirect: "follow",
            signal: this.probeRequestController.signal,
        })
        .then(r => {
            if (url === r.url) {
                const fileType = r.headers.get("Content-Type");
                fileType && this.setState({fileType});
            }
        })
        .finally(() => delete this.probeRequestController);
    }

    handleKeyDownShell(ev: React.KeyboardEvent): void {
        switch (ev.key) {
        case "ArrowRight":
            this.navigateNext();
            break;

        case "ArrowLeft":
            this.navigatePrev();
            break;
        }
    }

    handleTransition(): void {
        if (!this.navigateNext()) {
            this.props.transition.setInterval(-1);
        }
    }

    handleScalingChange(): void {
        this.forceUpdate();
    }

    private handleFocusedFileChanged(fileIndex: number | null): void {
        if (this.probeRequestController) {
            this.probeRequestController.abort();
            delete this.probeRequestController;
        }

        if (fileIndex === null)
            return;
    
        const {files} = this.props.browsing;
        let {preload} = this.props;
        if (preload > 0) {
            ++preload;

            const preloaded: Array<HTMLImageElement> = [];

            let n = Math.min(files.names.length, fileIndex + preload);
            while (--n > fileIndex)
                preloaded.push(loadImage(files, n));

            n = Math.max(-1, fileIndex - preload);
            while (++n < fileIndex)
                preloaded.push(loadImage(files, n));

            this.preloadedImages = preloaded;
        }

        this.forceUpdate();
    }
}

export const Definition = {
    id: "stage",
    path: Path,
    services: ["browsing", "transition"],
    component: Stage,
    selectPreferences: ({
        lineupEntries,
        lineupPosition,
        preload,
        thumbnailPath,
        thumbnailSizing,
        thumbnailResolution,
    }: preference.Set): PreferenceMappedProps => ({
        lineupEntries,
        lineupPosition,
        preload,
        thumbnailPath,
        thumbnailSizing,
        thumbnailResolution,
    }),
};