import {browsing} from "..";

export enum FilesOrder {
    System = 0,
    Lexical,
    Numeric,
    Tokenize,
    Dimensional,
    LengthLexical,
}

export interface BuiltinComparerConfig extends browsing.ComparerConfig {
    type: "builtin.comparer";
    mode: FilesOrder;
    token?: string;
}

interface CompareCache<V> {
    [k: string]: V;
}

abstract class BuiltinComparer implements browsing.Comparer {
    multiplier: number;

    constructor(reverse: boolean) {
        this.multiplier = reverse ? -1 : 1;
    }

    static TypeID = "builtin.comparer";

    public readonly id: number | undefined;

    protected cache: CompareCache<unknown> = {};

    public end(): void {
        this.cache = {};
    }

    public abstract compare(workingDirectory: string, first: string, second: string): number;
}

function parseNumericName(fileName: string): number {
    const delimiterIndex = fileName.lastIndexOf(".");
    if (delimiterIndex > 0)
        fileName = fileName.slice(0, delimiterIndex);

    return parseInt(fileName, 10);
}

class LexicalComparer extends BuiltinComparer {
    public compare(workingDirectory: string, first: string, second: string): number {
        return first.localeCompare(second) * this.multiplier;
    }
}

class LengthLexicalComparer extends BuiltinComparer {
    public compare(workingDirectory: string, first: string, second: string): number {
        return first.length - second.length ||
            first.localeCompare(second) * this.multiplier;
    }
}

class NumericComparer extends BuiltinComparer {
    public compare(workingDirectory: string, a: string, b: string): number {
        const cache = this.cache as CompareCache<number>;
        return (
            (cache[a] || (cache[a] = parseNumericName(a))) -
            (cache[b] || (cache[b] = parseNumericName(b)))
        ) * this.multiplier;
    }
}

abstract class TokenizingComparer extends BuiltinComparer {
    protected readonly token: string;
    constructor({token}: BuiltinComparerConfig, reverse: boolean) {
        super(reverse);
        this.token = token || "";
    }
}

class SplittingLexicalComparer extends TokenizingComparer {
    public compare(workingDirectory: string, a: string, b: string): number {
        const cache = this.cache as CompareCache<string[]>;
        const {token} = this;
        const av: Array<string> = cache[a] || (cache[a] = a.split(token));
        const bv: Array<string> = cache[b] || (cache[b] = b.split(token));

        for (let n = 0; n < av.length; ++n) {
            if (n >= bv.length)
                return this.multiplier;

            const diff = av[n].localeCompare(bv[n]);
            if (diff !== 0)
                return diff * this.multiplier;
        }

        return 0;
    }
}

class SplittingNumericComparer extends TokenizingComparer {
    public compare(workingDirectory: string, a: string, b: string): number {
        const cache = this.cache as CompareCache<number[]>;
        const {token} = this;
        const av: Array<number> = cache[a] || (cache[a] = a.split(token).map(parseNumericName));
        const bv: Array<number> = cache[b] || (cache[b] = b.split(token).map(parseNumericName));

        for (let n = 0; n < av.length; ++n) {
            if (n >= bv.length)
                return this.multiplier;

            const diff = av[n] - bv[n];
            if (diff !== 0)
                return diff * this.multiplier;
        }

        return 0;
    }
}

export class BuiltinComparerProvider implements browsing.ComparerProvider {
    public async create(config: BuiltinComparerConfig): Promise<browsing.Comparer> {
        const reverse = config.mode < 0;
        switch (Math.abs(config.mode)) {
            case FilesOrder.Lexical: return new LexicalComparer(reverse);
            case FilesOrder.LengthLexical: return new LengthLexicalComparer(reverse);
            case FilesOrder.Numeric: return new NumericComparer(reverse);
            case FilesOrder.Tokenize: return new SplittingLexicalComparer(config, reverse);
            case FilesOrder.Dimensional: return new SplittingNumericComparer(config, reverse);
        }

        throw new Error("Unsupported comparer request");
    }
}

export function isBuiltinComparer(filter: browsing.ComparerConfig): filter is BuiltinComparerConfig {
    return filter.type === BuiltinComparer.TypeID;
}