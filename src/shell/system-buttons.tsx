import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiWindowClose,
    mdiWindowMaximize,
    mdiWindowMinimize,
    mdiWindowRestore,
} from "@mdi/js";

interface Props {
    api: API;
}

interface State {
    maximized: boolean;
}

export class SystemButtons extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            maximized: props.api.getMaximzed(),
        };

        this.handleToggleMaximized = this.handleToggleMaximized.bind(this);
    }

    public handleToggleMaximized(): void {
        this.props.api.setMaximized(!this.state.maximized);
    }

    public componentDidMount(): void {
        window.addEventListener("maximize", () => {
            this.setState({maximized: true});
        });

        window.addEventListener("unmaximize", () => {
            this.setState({maximized: false});
        });
    }

    public render(): React.ReactNode {
        const {api} = this.props;
        const {maximized} = this.state;

        return <div className="background system">
            <ul className="actions">
                <li onClick={api.minimize}>
                    <Icon path={mdiWindowMinimize} />
                </li>
                <li onClick={this.handleToggleMaximized}>
                    <Icon path={maximized ? mdiWindowRestore : mdiWindowMaximize} />
                </li>
                <li onClick={api.closeWindow}>
                    <Icon path={mdiWindowClose} />
                </li>
            </ul>
        </div>;
    }
}