import * as React from "react";
import {Icon} from "@mdi/react";
import {
    mdiClose,
    mdiDockBottom,
    mdiDockLeft,
    mdiDockRight,
    mdiPlay,
    mdiStop,
    mdiImageSizeSelectActual,
    mdiFitToPage,
    mdiViewCarousel
} from "@mdi/js";

import {NumericInput} from "../number-input";
import {RadioButtons} from "../radio-buttons";
import {ScopeToggle} from "../scope-toggle";

import {Path} from "./constants";
import {TransitionService} from "./transition-service";

import type {preference} from "..";

interface PreferenceMappedProps {
    lineupEntries: number;
    lineupPosition: preference.PanelPosition;
    preload: number;
}

interface Props extends PreferenceMappedProps {
    transition: TransitionService;

    onSetPreferences(values: Partial<preference.Set>): void;

    localPreferences: preference.NameSet;
    onTogglePreferenceScope(name: preference.Name): void;
}

const lineupDockingModes: {
    id: preference.PanelPosition, title: string, icon: string
}[] = [
    {
        id: "disable",
        title: "Disable",
        icon: mdiClose,
    },
    {
        id: "bottom",
        title: "Dock bottom",
        icon: mdiDockBottom,
    },
    {
        id: "left",
        title: "Dock left",
        icon: mdiDockLeft,
    },
    {
        id: "right",
        title: "Dock right",
        icon: mdiDockRight,
    },
];

export class Menu extends React.PureComponent<Props> {
    private readonly redraw: () => void;
    private readonly togglePreloadScope: () => void;
    private readonly toggleLineupPositionScope: () => void;
    private readonly toggleLineupEntriesScope: () => void;

    constructor(props: Props) {
        super(props);
        this.redraw = this.forceUpdate.bind(this);

        this.togglePreloadScope = () => this.props.onTogglePreferenceScope("preload");
        this.toggleLineupPositionScope = () => this.props.onTogglePreferenceScope("lineupPosition");
        this.toggleLineupEntriesScope = () => this.props.onTogglePreferenceScope("lineupEntries");

        this.handlePreloadChanged = this.handlePreloadChanged.bind(this);
        this.handleSetLineupEntries = this.handleSetLineupEntries.bind(this);
        this.handleSetLineupPosition = this.handleSetLineupPosition.bind(this);
        this.handleToggleTransition = this.handleToggleTransition.bind(this);
        this.handleTransitionIntervalChanged = this.handleTransitionIntervalChanged.bind(this);
        this.toggleScaleToFit = this.toggleScaleToFit.bind(this);

        this.props.transition.on("intervalchange", this.redraw);
    }

    componentWillUnmount(): void {
        this.props.transition.off("intervalchange", this.redraw);
    }

    render(): React.ReactNode {
        const {
            localPreferences,
            preload,
            transition,
        } = this.props;

        const transitionInterval = this.props.transition.interval;

        return <ul className="menu stage">
            <li>
                <label>
                    <div>Scaling</div>
                    <button className="choice" onClick={this.toggleScaleToFit}>
                        <Icon path={transition.scaleToFit ? mdiFitToPage : mdiImageSizeSelectActual} />
                        <span>{transition.scaleToFit ? "Scale to fit" : "Actual size"}</span>
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
                    <NumericInput value={preload} min={0} max={9} onChange={this.handlePreloadChanged} />
                </label>
                <ScopeToggle
                    active={"preload" in localPreferences}
                    onClick={this.togglePreloadScope} />
            </li>
            <li>
                <label htmlFor="">
                    <div>Lineup location</div>
                    <RadioButtons
                        options={lineupDockingModes}
                        value={this.props.lineupPosition}
                        onChange={this.handleSetLineupPosition} />
                </label>
                <ScopeToggle
                    active={"lineupPosition" in localPreferences}
                    onClick={this.toggleLineupPositionScope} />
            </li>
            {this.props.lineupPosition !== "disable" && <li>
                <label>
                    <div>Lineup look ahead</div>
                    <NumericInput
                        value={this.props.lineupEntries}
                        min={0}
                        max={9}
                        onChange={this.handleSetLineupEntries} />
                </label>
                <ScopeToggle
                    active={"lineupEntries" in localPreferences}
                    onClick={this.toggleLineupEntriesScope} />
            </li>}
        </ul>;
    }

    handlePreloadChanged(preload: number): void {
        this.props.onSetPreferences({preload});
    }

    handleSetLineupEntries(lineupEntries: number): void {
        this.props.onSetPreferences({lineupEntries});
    }

    handleSetLineupPosition(lineupPosition: preference.PanelPosition): void {
        this.props.onSetPreferences({lineupPosition});
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

    toggleScaleToFit(): void {
        const {transition} = this.props;
        transition.setScaleToFit(!transition.scaleToFit);
        this.forceUpdate();
    }
}

export const Definition = {
    id: "stage",
    icon: mdiViewCarousel,
    label: "Stage",
    path: [Path],
    requireDirectory: true,
    services: ["transition"],
    component: Menu,
    selectPreferences: ({
        lineupEntries,
        lineupPosition,
        preload,
    }: preference.Set): PreferenceMappedProps => ({
        lineupEntries,
        lineupPosition,
        preload,
    }),
};