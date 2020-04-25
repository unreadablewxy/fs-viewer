import "./gallery.sass";
import * as React from "react";

import {ScrollPane} from "../scroll-pane";

import {Thumbnail} from "./thumbnail";

interface Props {
    files: FilesView;
    thumbnailPath?: string;
    thumbnailScaling: ThumbnailSizing;
    initialFocus: number;
    columns: number;
    overscan: number;
    onFileSelected: (index: number) => void;
}

interface State {
    firstVisible: number;
    lastVisible: number;
    underflow?: boolean;
    animating?: boolean;
}

function thumbnailInnerSizeExpression(columns: number): string {
    return `(100vw - ${(columns - 1) * 4}px) / ${columns}`;
}

function thumbnailOuterSizeExpression(columns: number): string {
    return `100vw / ${columns}`;
}

function thumbnailCalcSize(columns: number, viewportWidth: number): number {
    return viewportWidth / columns;
}

export class Gallery extends React.PureComponent<Props, State> {
    // The scrolling container
    private readonly viewport: React.RefObject<HTMLElement>;

    // The top & bottom "pusher"s that keeps the scroll size constant
    // Also serves as underflow/rapid scrolling detection
    private readonly unrenderedTop: React.RefObject<HTMLDivElement>;
    private readonly unrenderedBottom: React.RefObject<HTMLDivElement>;

    // The near-underflow warning detectors
    private readonly overscanTop: React.RefObject<HTMLDivElement>;
    private readonly overscanBottom: React.RefObject<HTMLDivElement>;

    // The container of visible thumbnails. We could query a selector from
    // viewport, but this is the more "React"y thing to do
    private readonly thumbnailContainer: React.RefObject<HTMLUListElement>;

    private animationTimer?: number;

    private catchupTimer?: number;
    private observer?: IntersectionObserver;
    private styles?: HTMLStyleElement;

    constructor(props: Props, context: any) {
        super(props, context);

        this.viewport = React.createRef();
        this.unrenderedTop = React.createRef();
        this.unrenderedBottom = React.createRef();
        this.overscanTop = React.createRef();
        this.overscanBottom = React.createRef();
        this.thumbnailContainer = React.createRef();

        // Since there's no way to know the size of the viewport at this point,
        // We ask first render to draw exactly 1 row so there's something to
        // scroll to after the component mounts
        const {initialFocus, columns} = this.props;
        const firstVisible = columns * Math.trunc(initialFocus / columns);
        this.state = {
            firstVisible,
            lastVisible: firstVisible + columns,
        };

        this.onIntersection = this.onIntersection.bind(this);
    }

    private clearCatchupTimer(): void {
        window.clearInterval(this.catchupTimer);
        delete this.catchupTimer;
    }

    private onCatchup(): void {
        const a = this.state;
        const b = this.getVisibleRange();
        if (a.firstVisible === b.firstVisible &&
            a.lastVisible === b.lastVisible)
        {
            if (!this.state.underflow)
                this.clearCatchupTimer();
        } else {
            this.setState(b);
        }
    }

    private onIntersection(
        entries: IntersectionObserverEntry[],
        observer: IntersectionObserver): void
    {
        const unrenderedTop = this.unrenderedTop.current;
        const unrenderedBottom = this.unrenderedBottom.current;
        const overscanTop = this.overscanTop.current;
        const overscanBottom = this.overscanBottom.current;

        let needUpdate = false;
        let underflow = false;
        for (let n = entries.length; n --> 0;) {
            const {target, isIntersecting} = entries[n];
            if (!isIntersecting)
                continue;

            switch (target) {
            case unrenderedTop:
            case unrenderedBottom:
                underflow = target.clientHeight > 0;
                n = 0;

            case overscanTop:
            case overscanBottom:
                needUpdate = true;
                break;
            }
        }

        this.setState({underflow});
        if (underflow && !this.catchupTimer)
            this.catchupTimer = window.setInterval(() => this.onCatchup(), 200);

        if (needUpdate)
            this.setState(() => this.getVisibleRange());
    }

    private updateStyles() {
        const stylesheet: CSSStyleSheet = this.styles?.sheet as CSSStyleSheet;
        while (stylesheet.cssRules.length > 0)
            stylesheet.deleteRule(0);

        const {columns} = this.props;
        const size = `calc(${thumbnailInnerSizeExpression(columns)})`;
        stylesheet.insertRule(
            `.gallery .thumbnail {width:${size};height:${size}}`);

        stylesheet.insertRule(
            `.gallery .thumbnail:nth-child(${columns}n) {margin-right:0}`);

        const space = thumbnailOuterSizeExpression(columns);
        stylesheet.insertRule(
            `.gallery .unrendered > div {height:calc(${space})}`);

        stylesheet.insertRule(
            `.gallery .unrendered.top > div {margin-bottom:calc(-1 * ${space})}`);

        stylesheet.insertRule(
            `.gallery .unrendered.bot > div {margin-top:calc(-1 * ${space})}`);
    }

    private getVisibleRange() {
        const viewport = this.viewport.current as HTMLElement;
        const viewportRect = viewport.getBoundingClientRect();

        const {columns} = this.props;
        const thumbWidth = thumbnailCalcSize(columns, viewportRect.width);

        // The max number of rows that can appear in the view port at a time
        // Not ceil(vp.height / thumb.size) because we can scroll into parts
        // of the first row and parts of the last row
        const viewportRows = 1 + Math.trunc(viewportRect.height / thumbWidth);
        const firstVisible = Math.trunc(viewport.scrollTop / thumbWidth) * columns;

        return {
            firstVisible: firstVisible,
            lastVisible: firstVisible + columns * viewportRows,
        };
    }

    public componentDidMount(): void {
        this.styles = document.createElement("style");
        document.head.appendChild(this.styles);
        this.updateStyles();

        let options: IntersectionObserverInit = {
            root: this.viewport.current,
            rootMargin: '0px',
            threshold: 0
        };

        // At this point, we're still drawing one row, so the scroll should
        // center our initial visible entry
        let thumbnails = this.thumbnailContainer.current as HTMLUListElement;
        thumbnails.scrollIntoView({block: "center"});

        // Upon creation, the observer should fire off an event that will
        // trigger a underflow event, which will properly measure the view port
        // and expand the 1 visible row to many
        this.observer = new IntersectionObserver(this.onIntersection, options);
        this.observer.observe(this.unrenderedTop.current as Element);
        this.observer.observe(this.unrenderedBottom.current as Element);
        this.observer.observe(this.overscanTop.current as Element);
        this.observer.observe(this.overscanBottom.current as Element);
    }

    public componentWillUnmount(): void {
        this.observer?.disconnect();
        document.head.removeChild(this.styles as HTMLStyleElement);

        if (this.catchupTimer)
            this.clearCatchupTimer();

        if (this.animationTimer)
            clearTimeout(this.animationTimer);
    }

    public componentDidUpdate(prev: Props): void {
        if (prev.columns !== this.props.columns) {
            this.updateStyles();
            this.beginAnimation();
        }

        if (prev.files !== this.props.files)
            this.onCatchup();
    }

    private beginAnimation(): void {
        if (this.animationTimer)
            clearTimeout(this.animationTimer);
        else
            this.viewport.current?.classList.add("animate");

        this.animationTimer = window.setTimeout(() => {
            this.viewport.current?.classList.remove("animate");
            delete this.animationTimer;
        }, 210);
    }

    public render() {
        const {
            files,
            columns,
            overscan,
            onFileSelected,
            thumbnailPath,
            thumbnailScaling,
        } = this.props;

        const {firstVisible, lastVisible} = this.state;

        let names: string[];
        let firstDrawn: number;
        let lastDrawn: number;
        let objectsCount: number;

        if (files) {
            const overscanCols = overscan * columns;

            firstDrawn = firstVisible - overscanCols;
            if (firstDrawn < 0) {
                firstDrawn = 0;
            } else if (firstDrawn > files.names.length) {
                firstDrawn = files.names.length;
            }

            lastDrawn = lastVisible + overscanCols;
            if (lastDrawn > files.names.length) {
                lastDrawn = files.names.length;
            }

            objectsCount = files.names.length;
            names = files.names.slice(firstDrawn, lastDrawn);
        } else {
            firstDrawn = lastDrawn = objectsCount = 0;
            names = [];
        }

        const rowHeightExpression = thumbnailOuterSizeExpression(columns);
        const unrenderedTopStyle = {
            height: `calc((${rowHeightExpression})*${Math.trunc(firstDrawn / columns)})`,
        };
        const unrenderedBottomStyle = {
            height: `calc((${rowHeightExpression})*${Math.ceil((objectsCount - lastDrawn) / columns)})`,
        };

        const commonThumbnailProps = {
            files,
            pathFormat: thumbnailPath,
            onClick: onFileSelected,
        };

        return <section className={`gallery scale-${thumbnailScaling}`}>
            <ScrollPane contentRef={this.viewport}>
                <div className="unrendered top"
                    ref={this.unrenderedTop}
                    style={unrenderedTopStyle}
                >
                    <div ref={this.overscanTop}></div>
                </div>
                <ul ref={this.thumbnailContainer}>
                    {names.map((_, i) => (
                        <Thumbnail key={i + firstDrawn}
                            {...commonThumbnailProps}
                            index={i + firstDrawn} />
                    ))}
                </ul>
                <div className="unrendered bot"
                    ref={this.unrenderedBottom}
                    style={unrenderedBottomStyle}
                >
                    <div ref={this.overscanBottom}></div>
                </div>
            </ScrollPane>
        </section>;
    }
}