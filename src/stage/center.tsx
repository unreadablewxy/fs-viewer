import * as React from "react";

interface Props {
    children: React.ReactNode;
    onDrag: (dragging: boolean) => void;
}

interface Coordinate {
    x: number;
    y: number;
}

interface State {
    scale: number;
    anchor: Coordinate | null;
    offset: Coordinate;
}

type DIVMouseEvent = React.MouseEvent<HTMLDivElement, MouseEvent>;

export class Center extends React.PureComponent<Props, State> {
    constructor(props: Props, context: any) {
        super(props, context);

        this.state = {
            scale: 1.0,
            anchor: null,
            offset: {
                x: 0,
                y: 0,
            },
        };

        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseWheel = this.handleMouseWheel.bind(this);
    }

    public render() {
        const {anchor, offset, scale} = this.state;
        const otherProps: React.HTMLAttributes<HTMLDivElement> = {};
        if (anchor)
            otherProps.onMouseMove = this.handleMouseMove;

        const style = {
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        };

        return <div className="center"
            onMouseDown={this.handleMouseDown}
            onMouseUp={this.handleMouseUp}
            onWheel={this.handleMouseWheel}
            {...otherProps}
        >
            <div style={style}>{this.props.children}</div>
        </div>;
    }

    private handleMouseUp(ev: DIVMouseEvent): void {
        this.setState({anchor: null});
        this.props.onDrag(false);
    }

    private handleMouseMove({pageX, pageY}: DIVMouseEvent): void {
        this.setState(p => p.anchor && {
          offset: {
            x: pageX - p.anchor.x,
            y: pageY - p.anchor.y,
          },
        });
    }

    private handleMouseDown({button, pageX, pageY}: DIVMouseEvent): void {
        if (button !== 0) return;

        this.setState(p => ({
          anchor: {
            // We subtract because ultimately we want this in the move handler:
            // offset = mouse - mouse_original + offset_original
            // Since on the other side is doing:
            // offset = mouse - original
            // We need to negate the offset part so it is double negated
            x: pageX - p.offset.x,
            y: pageY - p.offset.y,
          },
        }));

        this.props.onDrag(true);
    }

    private handleMouseWheel({deltaY}: React.WheelEvent<HTMLDivElement>): void {
        const change = deltaY / -400;
        if (change)
            this.setState(p => ({
                scale: Math.min(Math.max(0.1, p.scale + change), 4),
            }));
    }
}