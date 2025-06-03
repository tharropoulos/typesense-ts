import type {
  Collection,
  CollectionField,
  InferNativeType,
} from "@/collection";
import type { Configuration } from "@/config";
import type { ParseFilter } from "@/lexer/filter";

export interface DocumentWriteParameters {
  dirty_values?: "coerce_or_reject" | "coerce_or_drop" | "drop" | "reject";
  action?: "create" | "update" | "upsert" | "emplace";
}

export interface DocumentImportParameters<
  Doc extends boolean,
  Id extends boolean,
> extends DocumentWriteParameters {
  batch_size?: number;
  remote_embedding_batch_size?: number;
  remote_embedding_timeout_ms?: number;
  remote_embedding_num_tries?: number;
  return_doc?: Doc;
  return_id?: Id;
}

export type DocumentImportResponseSuccess<
  T extends Collection,
  Doc extends boolean,
  Id extends boolean,
> =
  Doc extends true ?
    Id extends true ?
      {
        document: InferNativeType<T["fields"] & CollectionField[]>;
        id: string;
        success: true;
      }
    : {
        document: InferNativeType<T["fields"] & CollectionField[]>;
        success: true;
      }
  : Id extends true ?
    {
      id: string;
      success: true;
    }
  : {
      success: true;
    };

export interface ImportResponseFail {
  success: false;
  error: string;
  document: Record<string, unknown>;
  code: number;
}

export type UpdateParameters<
  Schema extends Collection,
  FilterBy extends string,
> =
  ParseFilter<FilterBy, Schema> extends true ?
    {
      filter_by: FilterBy;
    }
  : `[Error on filter_by]: ${ParseFilter<FilterBy, Schema> & string}`;

export type UpdateResponse<
  DocName extends string | undefined,
  Schema extends Collection,
> =
  DocName extends undefined ?
    {
      num_updated: number;
    }
  : InferNativeType<Schema["fields"] & CollectionField[]>;

export interface DocumentOperations<T extends Collection> {
  create<const Doc extends boolean = false, const Id extends boolean = false>(
    document: Omit<InferNativeType<T["fields"] & CollectionField[]>, "id"> & {
      id?: string;
    },
    parameters?: DocumentImportParameters<Doc, Id>,
  ): Promise<InferNativeType<T["fields"] & CollectionField[]>>;

  import<
    const Doc extends boolean = false,
    const Id extends boolean = false,
    const Fail extends boolean = true,
  >(
    documents: (Omit<InferNativeType<T["fields"] & CollectionField[]>, "id"> & {
      id?: string;
    })[],
    parameters?: DocumentImportParameters<Doc, Id>,
    options?: {
      throw_on_failure?: Fail;
    },
    config?: Configuration,
  ): Promise<
    Fail extends true ? DocumentImportResponseSuccess<T, Doc, Id>[]
    : (DocumentImportResponseSuccess<T, Doc, Id> | ImportResponseFail)[]
  >;

  update<
    const FilterBy extends string,
    const DocId extends string | undefined = undefined,
  >(
    document: Partial<InferNativeType<T["fields"] & CollectionField[]>>,
    params: (
      | {
          documentId: DocId;
          parameters?: never;
        }
      | {
          documentId?: never;
          parameters: UpdateParameters<T, FilterBy>;
        }
    ) &
      DocumentWriteParameters,
    config?: Configuration,
  ): Promise<UpdateResponse<DocId extends undefined ? undefined : string, T>>;

  retrieve(
    documentId: string,
    config?: Configuration,
  ): Promise<InferNativeType<T["fields"] & CollectionField[]>>;
}
