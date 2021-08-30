import type {browsing, tag} from "..";

export const UntaggedID = -1;

export interface TagFilterConfig extends browsing.FilterConfig {
    type: "builtin.filter.tag";
    tag: tag.ID;
    namespace: tag.NamespaceID;
}

export class TagFilter implements browsing.Filter {
    static TypeID = "builtin.filter.tag";

    public readonly id: number | undefined;

    constructor(private readonly files: Set<string>) {
        // Do nothing
    }

    public filter({path, names}: browsing.FilesView): browsing.FilesView {
        const result: browsing.FilesView = {
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

export class TagFilterProvider implements browsing.FilterProvider {
    constructor(private readonly tags: tag.Service) {
        // Do nothing
    }

    public async create(config: TagFilterConfig): Promise<browsing.Filter> {
        const files = config.tag === UntaggedID
            ? await this.tags.getUntaggedFiles()
            : await this.tags.getFiles(config.tag)
    
        return new TagFilter(files);
    }
}

export function isTagFilter(filter: browsing.FilterConfig): filter is TagFilterConfig {
    return filter.type === TagFilter.TypeID;
}