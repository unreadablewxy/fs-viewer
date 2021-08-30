import {FilesOrder, BuiltinComparerConfig, BuiltinComparerProvider, isBuiltinComparer} from "./comparer"

import type {preference, browsing} from "..";

export function initialize(
    browsing: browsing.Service,
    preferences: preference.Service,
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

function replaceComparer(browsing: browsing.Service, mode: FilesOrder, param?: string): void {
    for (const comparer of browsing.comparers) {
        if (isBuiltinComparer(comparer)) {
            browsing.removeComparer((comparer as unknown as browsing.Comparer).id as number);
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