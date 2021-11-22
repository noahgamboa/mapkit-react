import { ModelInit, MutableModel, PersistentModelConstructor } from "@aws-amplify/datastore";





type SearchCollectionMetaData = {
  readOnlyFields: 'createdAt' | 'updatedAt';
}

export declare class SearchCollection {
  readonly id: string;
  readonly data?: string;
  readonly searchCollectionId?: string;
  readonly name?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  constructor(init: ModelInit<SearchCollection, SearchCollectionMetaData>);
  static copyOf(source: SearchCollection, mutator: (draft: MutableModel<SearchCollection, SearchCollectionMetaData>) => MutableModel<SearchCollection, SearchCollectionMetaData> | void): SearchCollection;
}