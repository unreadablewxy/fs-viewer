import "./stage.sass";
import * as React from "react";

import {BrowsingService} from "../browsing";

import {Path} from "./constants";
import {Center} from "./center";
import {Lineup} from "./lineup";
import {TransitionService} from "./transition-service";

interface PreferenceMappedProps {
    preload: number;
    thumbnailPath?: string;
    thumbnailSizing: ThumbnailSizing;
    thumbnailResolution?: ThumbnailResolution;
}

interface Props extends PreferenceMappedProps {
    browsing: BrowsingService;
    transition: TransitionService;

    showActualSize: boolean;
}

interface State {
    dragging?: boolean;
    fileType?: string;
}

const videoFileSuffices = new Set(["avi", "mkv", "mp4", "mov", "webm"]);

function loadImage(files: FilesView, index: number): HTMLImageElement {
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

        this.handleDisableButtons = this.handleDisableButtons.bind(this);
        this.handleFocusedFileChanged = this.handleFocusedFileChanged.bind(this);
        this.handleImageError = this.handleImageError.bind(this);
        this.handleKeyDownShell = this.handleKeyDownShell.bind(this);
        this.handleTransition = this.handleTransition.bind(this);
        this.navigateNext = this.navigateNext.bind(this);
        this.navigatePrev = this.navigatePrev.bind(this);
    }

    componentDidMount(): void {
        this.props.browsing.on("filefocus", this.handleFocusedFileChanged);
        this.props.transition.on("transition", this.handleTransition);

        (this.container.current as HTMLElement).focus();
    }

    componentWillUnmount(): void {
        this.props.browsing.off("filefocus", this.handleFocusedFileChanged);
        this.props.transition.off("transition", this.handleTransition);
    }

    render(): React.ReactNode {
        const {files, focusedFile} = this.props.browsing;
        const fileIndex = focusedFile || 0;

        const {dragging, fileType} = this.state;
        const fileName = files.names[fileIndex];

        const suffixIndex = fileName.lastIndexOf('.');
        let isVideo = false;
        if (suffixIndex > 0) {
            isVideo = videoFileSuffices.has(fileName.slice(suffixIndex + 1));
        } else if (fileType) {
            isVideo = fileType.startsWith("video/");
        }

        const fileUrl = `file://${files.path}/${fileName}`;
        const showActualSize = false; // TODO: load ths from somewhere
        const cssClass = showActualSize ? "stage" : "stage fit";

        return <section className={cssClass}
            tabIndex={1}
            ref={this.container}
            onKeyDown={this.handleKeyDownShell}
        >
            <Center key={fileName} onDrag={this.handleDisableButtons}>
                {isVideo
                    ? <video src={fileUrl} controls />
                    : <img src={fileUrl}
                        alt={fileName}
                        onError={this.handleImageError} />}
            </Center>
            <Lineup browsing={this.props.browsing}
                thumbnailSizing={this.props.thumbnailSizing}
                thumbnailResolution={this.props.thumbnailResolution}
                thumbnailPath={this.props.thumbnailPath}
            />
            <button disabled={dragging || fileIndex <= 0}
                onClick={this.navigatePrev}
            />
            <button disabled={dragging || fileIndex >= files.names.length - 1}
                onClick={this.navigateNext}
            />
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

    handleDisableButtons(dragging: boolean): void {
        this.setState({dragging});
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
        preload,
        thumbnailPath,
        thumbnailSizing,
        thumbnailResolution,
    }: Preferences): PreferenceMappedProps => ({
        preload,
        thumbnailPath,
        thumbnailSizing,
        thumbnailResolution,
    }),
};