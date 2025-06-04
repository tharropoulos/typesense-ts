import type { Configuration } from "@/config";

interface StopwordCreate {
  stopwords: string[];
  locale?: string;
}

interface Stopword<Id extends string> extends StopwordCreate {
  id: Id;
}

interface StopwordDelete {
  id: string;
}

interface StopwordOperations<Id extends string> {
  stopword: Stopword<Id>;

  upsert(config?: Configuration): Promise<Stopword<Id>>;

  delete(config?: Configuration): Promise<StopwordDelete>;

  retrieve(config?: Configuration): Promise<{stopwords:Stopword<Id>}>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Stopwords {}

export type { StopwordOperations, StopwordCreate, Stopword, Stopwords };
