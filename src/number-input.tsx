import "./number-input.sass";
import * as React from "react";
import {Icon} from "@mdi/react";
import {mdiMinus, mdiPlus} from "@mdi/js";

interface Props {
    value: number;
    min?: number;
    max?: number;
    onChange(value: number): void;
}

function isNumber(x: number | undefined): x is number {
    return !!x || x === 0;
}

export class NumericInput extends React.PureComponent<Props> {
    increment = () => {
        let {value, max} = this.props;
        if (++value, !isNumber(max) || value <= max)
            this.props.onChange(value);
    };

    decrement = () => {
        let {value, min} = this.props;
        if (--value, !isNumber(min) || value >= min)
            this.props.onChange(value);
    };

    handlePreloadChanged = (ev: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseInt(ev.target.value) || 0;
        const {min, max} = this.props;
        if (isNumber(min) && value < min)
            value = min;

        if (isNumber(max) && value > max)
            value = max;

        if (value !== this.props.value)
            this.props.onChange(value);
    };

    render() {
        return <div className="group numeric-input">
            <input type="number"
                size={1}
                min={this.props.min}
                max={this.props.max}
                value={this.props.value}
                onChange={this.handlePreloadChanged} />
            <button onClick={this.decrement}>
                <Icon path={mdiMinus} />
            </button>
            <button onClick={this.increment}>
                <Icon path={mdiPlus} />
            </button>
        </div>;
    }
}