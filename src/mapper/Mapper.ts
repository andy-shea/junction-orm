export interface Mapper {
  preFlush?(): Promise<any>;
  postFlush?(): Promise<any>;
  insert(entityMap: object): Promise<any>;
  update(observerMap: object): Promise<any>;
  delete(entityMap: object): Promise<any>;
}
