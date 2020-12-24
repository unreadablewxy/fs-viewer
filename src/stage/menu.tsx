import * as React from "react";
import {Icon} from "@mdi/react";
import {mdiPlay, mdiStop, mdiImageSizeSelectActual, mdiFitToPage, mdiImageMove} from "@mdi/js";

import {ScopeToggle} from "../scope-toggle";

import {Path} from "./constants";
import {TransitionService} from "./transition-service";

interface PreferenceMappedProps {
    preload: number;
}

interface Props extends PreferenceMappedProps {
    transition: TransitionService;

    onSetPreferences(values: Partial<Preferences>): void;

    localPreferences: PreferenceNameSet;
    onTogglePreferenceScope(name: keyof Preferences): void;

    showActualSize: boolean;
    onToggleScaling(): void;
}

export class Menu extends React.PureComponent<Props> {
    private readonly redraw: () => void;
    private readonly togglePreloadScope: () => void;

    constructor(props: Props) {
        super(props);
        this.redraw = this.forceUpdate.bind(this);

        this.togglePreloadScope = () => this.props.onTogglePreferenceScope("preload");

        this.handleToggleTransition = this.handleToggleTransition.bind(this);
        this.handlePreloadChanged = this.handlePreloadChanged.bind(this);
        this.handleTransitionIntervalChanged = this.handleTransitionIntervalChanged.bind(this);

        this.props.transition.on("intervalchange", this.redraw);
    }

    componentWillUnmount(): void {
        this.props.transition.off("intervalchange", this.redraw);
    }

    render(): React.ReactNode {
        const {
            localPreferences,
            preload,
            showActualSize,
            onToggleScaling,
        } = this.props;

        const transitionInterval = this.props.transition.interval;

        return <ul className="menu thumbnails">
            <li>
                <label>
                    <div>Scaling</div>
                    <button className="toggle" onClick={onToggleScaling}>
                        <Icon path={showActualSize ? mdiImageSizeSelectActual : mdiFitToPage} />
                        <span>{showActualSize ? "Actual size" : "Show all"}</span>
                    </button>
                </label>
            </li>
            <li>
                <label>
                    <div>Slideshow delay (ms)</div>
                    <div className="group">
                        <input type="text"
                            size={1}
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
                    <input type="number"
                        size={1}
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

    handlePreloadChanged(ev: React.ChangeEvent<HTMLInputElement>): void {
        const preload = parseInt(ev.target.value) || 0;
        if (preload !== this.props.preload)
            this.props.onSetPreferences({preload});
    }

    handleToggleTransition(): void {
        const {transition} = this.props;
        transition.setInterval(transition.interval === 0 ? 3000 : 0);
    }

    handleTransitionIntervalChanged(ev: React.ChangeEvent<HTMLInputElement>): void {
        const value = parseInt(ev.target.value) || 0;
        const {transition} = this.props;
        if (value !== transition.interval)
            transition.setInterval(value);
    }
}

export const Definition = {
    id: "show",
    icon: mdiImageMove,
    label: "Show settings",
    path: [Path],
    requireDirectory: true,
    services: ["transition"],
    selectPreferences: ({preload}: Preferences): PreferenceMappedProps => ({preload}),
    component: Menu,
};