// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { SearchCollection } = initSchema(schema);

export {
  SearchCollection
};