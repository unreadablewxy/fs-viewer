import * as React from "react";
import {DraggableCore, DraggableData, DraggableEvent} from "react-draggable";

interface Props {
    children: React.ReactNode;
    atStart: boolean;
    atEnd: boolean;
    onNavigatePrev(): void;
    onNavigateNext(): void;
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

export class Center extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            scale: 1.0,
            anchor: null,
            offset: {
                x: 0,
                y: 0,
            },
        };

        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleDragMove = this.handleDragMove.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleMouseWheel = this.handleMouseWheel.bind(this);
    }

    public render(): React.ReactNode {
        const {anchor, offset, scale} = this.state;

        const style = {
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        };

        const dragging = !!anchor;

        return <div className="center">
            <DraggableCore
                onStart={this.handleDragStart}
                onDrag={this.handleDragMove}
                onStop={this.handleDragEnd}
            >
                <div className="background" onWheel={this.handleMouseWheel}>
                    <div className="content" style={style}>{this.props.children}</div>
                </div>
            </DraggableCore>

            <button disabled={dragging || this.props.atStart}
                onClick={this.props.onNavigatePrev}
            />
            <button disabled={dragging || this.props.atEnd}
                onClick={this.props.onNavigateNext}
            />
        </div>;
    }

    private handleDragEnd(): void {
        this.setState({anchor: null});
    }

    private handleDragMove(ev: DraggableEvent, {x, y}: DraggableData): void {
        this.setState(p => p.anchor && {
          offset: {
            x: x - p.anchor.x,
            y: y - p.anchor.y,
          },
        });
    }

    private handleDragStart(ev: DraggableEvent, {x, y}: DraggableData): void {
        this.setState(p => ({
          anchor: {
            // We subtract because ultimately we want this in the move handler:
            // offset = mouse - mouse_original + offset_original
            // Since on the other side is doing:
            // offset = mouse - original
            // We need to negate the offset part so it is double negated
            x: x - p.offset.x,
            y: y - p.offset.y,
          },
        }));
    }

    private handleMouseWheel({
        currentTarget,
        deltaY,
        clientX,
        clientY,
    }: React.WheelEvent<HTMLDivElement>): void {
        let change = 1 + deltaY / -600;
        if (change > 1) {
            if (change * this.state.scale > 8) {
                return;
            }
        } else {
            if (change * this.state.scale < 0.3) {
                return;
            }
        }

        const rect = (currentTarget as HTMLElement).getBoundingClientRect();
        this.setState(({offset, scale}) => {
            // Transform to image centric coordniates
            const relativeX = (clientX - rect.x) - (rect.width / 2) - offset.x;
            const relativeY = (clientY - rect.y) - (rect.height / 2) - offset.y;

            return {
                offset: {
                    x: offset.x + (relativeX - (relativeX * (scale * change) / scale)),
                    y: offset.y + (relativeY - (relativeY * (scale * change) / scale)),
                },
                scale: scale * change,
            };
        });
    }
}