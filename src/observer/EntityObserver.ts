import {Entity, Schema, CollectionsMap, ElementCollectionType} from '../Entity';
import CollectionObserver from './CollectionObserver';

interface CollectionObserverMap {
  [prop: string]: CollectionObserver;
}

function dirtyCollections(collections: CollectionObserverMap) {
  return Object.keys(collections).filter(prop => collections[prop].isDirty());
}

function observeCollections(entity: Entity, collections: CollectionsMap) {
  return collections ? Object.keys(collections).reduce((collectionsMap: CollectionObserverMap, prop) => {
    if ((<ElementCollectionType>collections[prop]).element) {
      collectionsMap[prop] = new CollectionObserver((<ElementCollectionType>collections[prop]), (<any>entity)[prop]);
      (<any>entity)[prop] = collectionsMap[prop].proxy;
    }
    return collectionsMap;
  }, {}) : {};
}

function createProxy(entity: Entity, dirtyProps: Set<string>) {
  return new Proxy(entity, {
    set: (target, prop: string, value) => {
      if ((<any>target)[prop] !== value) dirtyProps.add(prop);
      return Reflect.set(target, prop, value);
    },

    deleteProperty: (target, prop: string) => {
      if (prop in target) dirtyProps.add(prop);
      return Reflect.deleteProperty(target, prop);
    }
  });
}

class EntityObserver {

  private dirtyProps = new Set<string>();
  private collections: CollectionObserverMap = {};
  public proxy: Entity;

  constructor(schema: Schema, public entity: Entity) {
    this.entity = entity;
    if (schema.collections) {
      this.collections = observeCollections(entity, schema.collections);
    }
    this.proxy = createProxy(entity, this.dirtyProps);
  }

  isDirty(): boolean {
    return !!(this.dirtyProps.size || !!dirtyCollections(this.collections).length);
  }

  isObserving(entityOrProxy: Entity) {
    return (this.entity === entityOrProxy || this.proxy === entityOrProxy);
  }

  clear() {
    this.dirtyProps.clear();
    Object.keys(this.collections).forEach(prop => this.collections[prop].clear());
  }

  changed() {
    return {
      props: [...this.dirtyProps.values()],
      collections: dirtyCollections(this.collections).reduce((changed: string[], prop) => {
        if (this.collections[prop].changed()) changed.push(prop);
        return changed;
      }, [])
    };
  }

}

export default EntityObserver;
