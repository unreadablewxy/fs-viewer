export interface Stage {
    readonly id: number | undefined;
}

export interface Config {
    readonly type: string;
}

export interface Provider<C extends Config, S extends Stage> {
    create(config: C): Promise<S>;
}

type StageListElement<C extends Config, S extends Stage> = S & C & {id: number};

export class Pipeline<C extends Config, S extends Stage> {
    public stages: ReadonlyArray<StageListElement<C, S>> = [];
    private readonly providers: { [id: string]: Provider<C, S> } = {};
    private nextID: number = 1;

    public async add(config: C): Promise<number> {
        const provider = this.providers[config.type];
        if (!provider)
            throw new Error(`Unkonwn component type id ${config.type}`);

        while (this.stages.find(s => s.id === this.nextID))
            this.nextID = (this.nextID + 1) % 10240;

        const instance = Object.assign(
            Object.create(await provider.create(config)),
            config) as StageListElement<C, S>;

        (instance as {id: number}).id = this.nextID++;
        this.stages = this.stages.concat(instance);
        return instance.id;
    }

    public remove(id: number): void {
        const index = this.stages.findIndex(s => s.id === id);
        if (index > -1)
            this.stages = this.stages.slice(0, index).concat(this.stages.slice(index + 1));
    }

    public clear(): void {
        this.stages = [];
        this.nextID = 1;
    }

    public register(type: string, provider: Provider<C, S>): void {
        this.providers[type] = provider;
    }
}