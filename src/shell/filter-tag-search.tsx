import * as React from "react";

interface Props {
    value: string;

    onChange: (term: string) => void;
    onSubmit: (toggle: boolean) => void;
    onSelectChange: (offset: number) => void;
    onModeChange: (forceCreate: boolean) => void;
}

interface State {
    shiftDown?: boolean;
    controlDown?: boolean;
    altDown?: boolean;
}

const noKeyDown = {
    shiftDown: false,
    altDown: false,
    controlDown: false,
};

type KeyStateNames = "shiftDown" | "controlDown" | "altDown";

export class FilterTagSearch extends React.PureComponent<Props, State> {
    constructor(props: Props, context: any) {
        super(props, context);

        this.state = {};

        this.handleBlur = this.handleBlur.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    render() {
        const {value} = this.props;

        return <label>
            <div>Search</div>
            <input type="search"
                placeholder="Tag name"
                value={value}
                onChange={this.handleChange}
                onKeyDown={this.handleKeyDown}
                onKeyUp={this.handleKeyUp}
                onBlur={this.handleBlur} />
        </label>;
    }

    private dispatchModeChange(): void {
        this.props.onModeChange(!!this.state.controlDown);
    }

    handleBlur(ev: React.FocusEvent): void {
        const {altDown, controlDown, shiftDown} = this.state;
        if (altDown || controlDown || shiftDown)
            this.setState(noKeyDown, () => this.dispatchModeChange());
    }

    handleChange(ev: React.ChangeEvent<HTMLInputElement>): void {
        this.props.onChange(ev.target.value);
    }

    handleKeyDown(ev: React.KeyboardEvent): void {
        switch (ev.key) {
        case "Alt":
        case "Control":
        case "Shift":
            const stateKey = `${ev.key.toLowerCase()}Down` as KeyStateNames;
            this.setState({[stateKey]: true}, () => this.dispatchModeChange());
            break;

        case "Enter":
            this.props.onSubmit(!!this.state.shiftDown);
            break;

        case "ArrowUp":
            this.props.onSelectChange(-1);
            break;

        case "ArrowDown":
            this.props.onSelectChange(1);
            break;
        }
    }

    handleKeyUp(ev: React.KeyboardEvent): void {
        switch (ev.key) {
        case "Alt":
        case "Control":
        case "Shift":
            const stateKey = `${ev.key.toLowerCase()}Down` as KeyStateNames;
            this.setState({[stateKey]: false}, () => this.dispatchModeChange());
            break;
        }
    }
}