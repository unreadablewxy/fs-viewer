import "./scroll-pane.sass"
import * as React from "react";

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

    constructor(props: Props, ...others: unknown[]) {
        super(props, ...others);

        this.state = {
            anchor: null,
            scrollStart: null,
        };

        this.content = React.createRef<HTMLDivElement>();
        this.handle = React.createRef<HTMLDivElement>();

        this.handleContentScroll = this.handleContentScroll.bind(this);
        this.handleTrackWheel = this.handleTrackWheel.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.beginDrag = this.beginDrag.bind(this);
        this.updateHandle = this.updateHandle.bind(this);
    }

    componentDidMount() {
        if (this.props.contentRef)
            (this.props.contentRef as any).current = this.content.current;

        if (this.content.current)
            this.content.current.addEventListener(
                "scroll", this.handleContentScroll, {passive: true});

        this.updateHandle();
    }

    componentDidUpdate(prevProps: Props) {
        if (this.props.contentRef !== prevProps.contentRef)
            (this.props.contentRef as any).current = this.content.current;

        this.handleContentScroll();
    }

    componentWillUnmount() {
        if (this.handleUpdateTimer)
            clearTimeout(this.handleUpdateTimer);

        if (this.content.current)
            this.content.current.removeEventListener("scroll", this.handleContentScroll);

        this.removeMouseHandlers();
    }

    render() {
        const {children} = this.props;

        return <div className="scroll-pane">
            <div className="content" ref={this.content}>
                {children}
            </div>
            <div className="track" onWheel={this.handleTrackWheel}>
                <div ref={this.handle} onMouseDown={this.beginDrag}></div>
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

    handleMouseMove(ev: MouseEvent) {
        const contentElement = this.content.current;
        if (contentElement) {
            const scroll = getScroll(contentElement, this.handle.current as HTMLElement);
            const mouseOffset = ev.pageY - (this.state.anchor as number);
            
            let handleOffset = (this.state.scrollStart as number) + scroll.range * mouseOffset / scroll.handle.range;
            if (handleOffset < 0) {
                handleOffset = 0;
            } else if (handleOffset > scroll.range) {
                handleOffset = scroll.range;
            }

            contentElement.scrollTop = handleOffset;
        }
    }

    handleMouseUp(ev: MouseEvent) {
        this.setState({
            anchor: null,
            scrollStart: null,
        });

        this.removeMouseHandlers();
    }

    beginDrag(ev: React.MouseEvent<HTMLDivElement>): void {
        this.setState({
            anchor: ev.pageY,
            scrollStart: this.content.current?.scrollTop || 0,
        });

        document.addEventListener("mousemove", this.handleMouseMove);
        document.addEventListener("mouseup", this.handleMouseUp);
    }

    private removeMouseHandlers() {
        document.removeEventListener("mousemove", this.handleMouseMove);
        document.removeEventListener("mouseup", this.handleMouseUp);
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
