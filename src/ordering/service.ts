import {PreferenceService} from "../application/preference-service";
import {FilesOrder, BuiltinComparerConfig, BuiltinComparerProvider, isBuiltinComparer} from "./comparer"

import type {BrowsingService, Comparer} from "../browsing";

export function initialize(
    browsing: BrowsingService,
    preferences: PreferenceService,
): void {
    browsing.registerComparerProvider("builtin.comparer", new BuiltinComparerProvider());

    preferences.on("change", (delta, prefs) => {
        const paramChanged = "orderParam" in delta;
        const orderChanged = "order" in delta;
        if (paramChanged || orderChanged) {
            replaceComparer(
                browsing,
                orderChanged ? delta.order as FilesOrder : prefs.order,
                paramChanged ? delta.orderParam : prefs.orderParam);
        }
    });
}

function replaceComparer(browsing: BrowsingService, mode: FilesOrder, param?: string): void {
    for (const comparer of browsing.comparers) {
        if (isBuiltinComparer(comparer)) {
            browsing.removeComparer((comparer as unknown as Comparer).id as number);
            break;
        }
    }

    if (mode !== FilesOrder.System) {
        const config: BuiltinComparerConfig = {
            type: "builtin.comparer",
            mode,
            token: param,
        };

        browsing.addComparer(config);
    }
}