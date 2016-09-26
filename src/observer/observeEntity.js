import observeCollection from './observeCollection';

function dirtyCollections(collections) {
  return Object.keys(collections).filter(prop => collections[prop].isDirty());
}

function observeCollections(entity, collections) {
  return collections ? Object.keys(collections).reduce((collectionsMap, prop) => {
    collectionsMap[prop] = observeCollection(collections[prop], entity[prop]);
    entity[prop] = collectionsMap[prop].proxy;
    return collectionsMap;
  }, {}) : {};
}

function createProxy(entity, dirtyProps) {
  return new Proxy(entity, {
    set: (target, prop, value) => {
      if (target[prop] !== value) dirtyProps.add(prop);
      return Reflect.set(target, prop, value);
    },

    deleteProperty: (target, prop) => {
      if (prop in target) dirtyProps.add(prop);
      return Reflect.deleteProperty(target, prop);
    }
  });
}

const EntityObserver = {
  init(schema, entity) {
    if (!schema || !entity) throw Error('Schema and entity must be provided');
    this.entity = entity;
    this.collections = observeCollections(entity, schema.collections);
    this.dirtyProps = new Set();
    this.proxy = createProxy(entity, this.dirtyProps);
    return this;
  },

  isDirty() {
    return (this.dirtyProps.size || !!dirtyCollections(this.collections).length);
  },

  isObserving(entityOrProxy) {
    return (this.entity === entityOrProxy || this.proxy === entityOrProxy);
  },

  clear() {
    this.dirtyProps.clear();
    Object.keys(this.collections).forEach(prop => this.collections[prop].clear());
  },

  changed() {
    return {
      props: [...this.dirtyProps.values()],
      collections: dirtyCollections(this.collections).reduce((changed, prop) => {
        if (this.collections[prop].changed()) changed.push(prop);
        return changed;
      }, [])
    };
  }
};

function observeEntity(schema, entity) {
  return Object.create(EntityObserver).init(schema, entity);
}

export default observeEntity;
