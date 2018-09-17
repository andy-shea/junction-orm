export enum SchemaTypes {
  ENTITY = 'entity',
  EMBEDDED = 'embedded'
}

interface PropertyType {
  type?: string | EntityType<Entity>;
}

interface Properties {
  [prop: string]: PropertyType;
}

// TODO: don't think we need to track non-entity collections
// when persisting these it should be totally removed and re-persisted
interface PrimitiveCollectionType {
  type: string;
}

export interface ElementCollectionType {
  element: EntityType<Entity>;
}

export interface CollectionsMap {
  [prop: string]: PrimitiveCollectionType | ElementCollectionType;
}

export interface Schema {
  type: SchemaTypes;
  props: Properties;
  collections?: CollectionsMap;
}

export interface Entity {
  id?: number;
}

export interface EntityType<T> {
  new(...args: any[]): T;
  schema: Schema;
}

export interface Timestampable {
  createdAt?: Date;
  updatedAt?: Date;
}
