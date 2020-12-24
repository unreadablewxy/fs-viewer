import {MenuDefinition as Tagging} from "../tag";
import {MenuDefinition as GalleryMenu, ModeDefinition as Gallery} from "../gallery";
import {Definition as Ordering} from "../ordering/menu";
import {MenuDefinition as StageMenu, ModeDefinition as Stage} from "../stage";

export const Namespace = "..builtin";

export const builtinMenus = [
    Tagging,
    Ordering,
    GalleryMenu,
    StageMenu,
];

export const builtinModes = [
    Gallery,
    Stage,
];