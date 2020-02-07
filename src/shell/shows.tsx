import * as React from "react";
import {Icon} from "@mdi/react";
import {mdiPlay, mdiStop} from "@mdi/js";

import {ScopeToggle} from "./scope-toggle";

interface Props {
    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;

    preload: number;
    onPreloadChanged(preload: number): void;

    transitionInterval: number;
    onTransitionIntervalChanged(interval: number): void;
}

// Gets the names of an object's members that extends a particular type
type MembersOfType<O, T> = {[K in keyof O]: O[K] extends T ? K : never}[keyof O];

type InputChangeHandler = (ev: React.ChangeEvent<HTMLInputElement>) => void;

function forwardNumericProp(
    this: {props: Props},
    propName: MembersOfType<Props, number>,
    handlerName: MembersOfType<Props, (v: number) => void>,
    ev: React.ChangeEvent<HTMLInputElement>,
): void {
    const previous = this.props[propName];
    const value = parseInt(ev.target.value) || 0;
    if (value !== previous) {
        const handler = this.props[handlerName];
        handler(value);
    }
}

export class Shows extends React.PureComponent<Props> {
    private readonly togglePreloadScope: () => void;
    private readonly handlePreloadChanged: InputChangeHandler;
    private readonly handleTransitionIntervalChanged: InputChangeHandler;

    constructor(props: Props, context: any) {
        super(props, context);

        this.togglePreloadScope = () => this.props.onTogglePreferenceScope("preload");

        this.handleToggleTransition = this.handleToggleTransition.bind(this);
        this.handlePreloadChanged = forwardNumericProp.bind(this, "preload", "onPreloadChanged");
        this.handleTransitionIntervalChanged = forwardNumericProp.bind(this, "transitionInterval", "onTransitionIntervalChanged");
    }

    public render() {
        const {
            localPreferences,
            preload,
            transitionInterval,
        } = this.props;

        return <ul className="menu thumbnails">
            <li>
                <label>
                    <div>Slideshow delay (ms)</div>
                    <div className="group">
                        <input
                            value={transitionInterval || "Off"}
                            onChange={this.handleTransitionIntervalChanged} />
                        <button onClick={this.handleToggleTransition}>
                            <Icon path={transitionInterval === 0 ? mdiPlay : mdiStop} />
                        </button>
                    </div>
                </label>
            </li>
            <li>
                <label>
                    <div>Files to preload</div>
                    <input
                        type="range"
                        min="0"
                        max="9"
                        value={preload}
                        onChange={this.handlePreloadChanged} />
                </label>
                <ScopeToggle
                    active={"preload" in localPreferences}
                    onClick={this.togglePreloadScope} />
            </li>
        </ul>;
    }

    private handleToggleTransition(): void {
        const {transitionInterval, onTransitionIntervalChanged} = this.props;
        onTransitionIntervalChanged(transitionInterval === 0 ? 3000 : 0);
    }
}