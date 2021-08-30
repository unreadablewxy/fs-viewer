import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiWindowClose,
    mdiWindowMaximize,
    mdiWindowMinimize,
    mdiWindowRestore,
} from "@mdi/js";

import {Debounce} from "../debounce";
import type {WindowService} from "../window";

interface Props {
    window: WindowService;
}

interface State {
    maximized: boolean;
    hidden: boolean;
}

export class SystemButtons extends React.PureComponent<Props, State> {
    private readonly update = new Debounce(async () => {
        const status = await this.props.window.getStatus();
        this.setState({
            hidden: status.tabletMode,
            maximized: status.maximized,
        });
    }, 100);

    constructor(props: Props) {
        super(props);

        this.state = {
            maximized: false,
            hidden: false,
        };
    }

    handleToggleMaximized = () => {
        if (this.state.maximized)
            this.props.window.unmaximize();
        else
            this.props.window.maximize();
    }

    componentDidMount(): void {
        const {window} = this.props;
        
        window.on("maximize", () => {
            this.setState({maximized: true});
        });

        window.on("unmaximize", () => {
            this.setState({maximized: false});
        });

        window.on("resize", () => {
            this.update.schedule();
        });

        this.update.schedule();
    }

    render(): React.ReactNode {
        const {window} = this.props;
        return !this.state.hidden && <div className="panel system">
            <ul className="actions">
                <li onClick={window.minimize}>
                    <Icon path={mdiWindowMinimize} />
                </li>
                <li onClick={this.handleToggleMaximized}>
                    <Icon path={this.state.maximized ? mdiWindowRestore : mdiWindowMaximize} />
                </li>
                <li onClick={window.close}>
                    <Icon path={mdiWindowClose} />
                </li>
            </ul>
        </div>;
    }
}