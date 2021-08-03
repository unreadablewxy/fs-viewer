export {Filter as Menu, Definition as MenuDefinition} from "./menu";
export {create as createTaggingService} from "./service";

export type {TaggingService as Service} from "./service";

export type NamespaceID = number;

export interface Namespace {
    /**
     * A magic number that identifies tags translatable by this namespace
     */
    identifier: NamespaceID;

    /**
     * The tags that are available in the directory
     */
    names: Map<number, string>;

    /**
     * The next free to assign to a tag
     */
    nextId: number;
}

export type TagID = number;

export interface Tags {
    namespace: NamespaceID;
    ids: Set<TagID>;
}