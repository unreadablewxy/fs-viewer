import {TaggingService} from "./service";

import type {NamespaceID, TagID} from ".";
import type {Filter, FilterConfig, FilterProvider} from "../browsing";

export const UntaggedID = -1;

export interface TagFilterConfig extends FilterConfig {
    type: "builtin.filter.tag";
    tag: TagID;
    namespace: NamespaceID;
}

export class TagFilter implements Filter {
    static TypeID = "builtin.filter.tag";

    public readonly id: number | undefined;

    constructor(private readonly files: Set<string>) {
        // Do nothing
    }

    public filter({path, names}: FilesView): FilesView {
        const result: FilesView = {
            path,
            names: [],
        };

        for (let i = 0; i < names.length; ++i) {
            const name = names[i];

            if (this.files.has(name))
                result.names.push(name);
        }

        return result;
    }
}

export class TagFilterProvider implements FilterProvider {
    constructor(private readonly tags: TaggingService) {
        // Do nothing
    }

    public async create(config: TagFilterConfig): Promise<Filter> {
        const files = config.tag === UntaggedID
            ? await this.tags.getUntaggedFiles()
            : await this.tags.getFiles(config.tag)
    
        return new TagFilter(files);
    }
}

export function isTagFilter(filter: FilterConfig): filter is TagFilterConfig {
    return filter.type === TagFilter.TypeID;
}