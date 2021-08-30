import "./scroll-pane.sass"
import * as React from "react";
import {DraggableCore, DraggableData, DraggableEvent} from 'react-draggable';

interface Props {
    children: React.ReactNode;
    contentRef?: React.RefObject<HTMLElement>;
}

interface State {
    anchor: number | null;
    scrollStart: number | null;
}

// Compute the dimensions of a scroll handle and the content it controls
function getScroll(contentElement: HTMLElement, handleElement: HTMLElement) {
    const contentHeight = contentElement.scrollHeight;

    const viewportElement = contentElement.parentElement as HTMLElement;
    const viewportHeight = viewportElement.clientHeight;

    const trackElement = handleElement.parentElement as HTMLElement;
    const trackHeight = trackElement.clientHeight;

    let handleHeight: number;
    if (contentHeight <= viewportHeight) {
        handleHeight = 0;
    } else {
        handleHeight = Math.max(32, trackHeight * viewportHeight / contentHeight);
    }

    return {
        position: contentElement.scrollTop,
        range: contentHeight - viewportHeight,

        handle: {
            height: handleHeight,
            range: trackHeight - handleHeight,
        },
    };
}

// We don't emulate scrolling, instead, we report what it is saying
export class ScrollPane extends React.PureComponent<Props, State> {
    private handleUpdateTimer?: number;
    private readonly content: React.RefObject<HTMLDivElement>;
    private readonly handle: React.RefObject<HTMLDivElement>;

    constructor(props: Props) {
        super(props);

        this.state = {
            anchor: null,
            scrollStart: null,
        };

        this.content = React.createRef<HTMLDivElement>();
        this.handle = React.createRef<HTMLDivElement>();

        this.handleContentScroll = this.handleContentScroll.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleTrackWheel = this.handleTrackWheel.bind(this);
        this.handleDragMove = this.handleDragMove.bind(this);
        this.updateHandle = this.updateHandle.bind(this);
    }

    componentDidMount(): void {
        // intentional hack
        // eslint-disable @typescript-eslint/no-explicit-any
        if (this.props.contentRef)
            (this.props.contentRef as any).current = this.content.current;

        if (this.content.current)
            this.content.current.addEventListener(
                "scroll", this.handleContentScroll, {passive: true});

        this.updateHandle();
    }

    componentDidUpdate(prevProps: Props): void {
        // intentional hack
        // eslint-disable @typescript-eslint/no-explicit-any
        if (this.props.contentRef !== prevProps.contentRef)
            (this.props.contentRef as any).current = this.content.current;

        this.handleContentScroll();
    }

    componentWillUnmount(): void {
        if (this.handleUpdateTimer)
            clearTimeout(this.handleUpdateTimer);

        if (this.content.current)
            this.content.current.removeEventListener("scroll", this.handleContentScroll);
    }

    render(): React.ReactNode {
        const {children} = this.props;

        return <div className="scroll-pane">
            <div className="content" ref={this.content}>
                {children}
            </div>
            <div className="track" onWheel={this.handleTrackWheel}>
                <DraggableCore
                    onStart={this.handleDragStart}
                    onDrag={this.handleDragMove}
                    onStop={this.handleDragEnd}
                >
                    <div ref={this.handle}></div>
                </DraggableCore>
            </div>
        </div>;
    }

    handleContentScroll(): void {
        if (!this.handleUpdateTimer)
            this.handleUpdateTimer = window.setTimeout(this.updateHandle, 20);
    }

    handleTrackWheel(ev: React.WheelEvent<HTMLDivElement>): void {
        const contentElement = this.content.current;
        if (contentElement) {
            contentElement.scrollTop += ev.deltaY;
        }
    }

    handleDragEnd(event: DraggableEvent, data: DraggableData): void {
        this.setState({
            anchor: null,
            scrollStart: null,
        });
    }

    handleDragStart(event: DraggableEvent, {y}: DraggableData): void {
        this.setState({
            anchor: y,
            scrollStart: this.content.current?.scrollTop || 0,
        });
    }

    handleDragMove(event: DraggableEvent, {y}: DraggableData): void {
        const contentElement = this.content.current;
        if (contentElement) {
            const scroll = getScroll(contentElement, this.handle.current as HTMLElement);
            const mouseOffset = y - (this.state.anchor as number);
            
            let handleOffset = (this.state.scrollStart as number) + scroll.range * mouseOffset / scroll.handle.range;
            if (handleOffset < 0) {
                handleOffset = 0;
            } else if (handleOffset > scroll.range) {
                handleOffset = scroll.range;
            }

            contentElement.scrollTop = handleOffset;
        }
    }

    private updateHandle(): void {
        const handleElement = this.handle.current;
        if (handleElement) {
            const scroll = getScroll(this.content.current as HTMLElement, handleElement);
            const handleOffset = Math.round(scroll.handle.range * scroll.position / scroll.range);
            handleElement.style.top = `${handleOffset}px`;
            handleElement.style.height = `${scroll.handle.height}px`;
        }

        delete this.handleUpdateTimer;
    }
}
