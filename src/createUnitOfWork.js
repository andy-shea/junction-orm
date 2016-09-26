import observeEntity from './observer/observeEntity';

function getEntityType(entity) {
  return entity.constructor.name;
}

function insertNewEntities(newEntities, mapper) {
  const added = {};
  newEntities.forEach(({entity}) => {
    const type = getEntityType(entity);
    if (!added[type]) added[type] = [];
    added[type].push(entity);
  });
  return mapper.insert(added);
}

function updateDirtyEntities(identityMaps, mapper) {
  const modified = {};
  identityMaps.forEach((registeredEntities, type) => {
    registeredEntities.forEach(observer => {
      if (observer.isDirty()) {
        if (!modified[type]) modified[type] = [];
        modified[type].push(observer);
      }
    });
  });
  return mapper.update(modified);
}

function deleteRemovedEntities(removedEntities, mapper) {
  const removed = {};
  removedEntities.forEach(entity => {
    const type = getEntityType(entity);
    if (!removed[type]) removed[type] = [];
    removed[type].push(entity);
  });
  return mapper.delete(removed);
}

const UnitOfWork = {
  init(entities, mapper) {
    this.mapper = mapper;
    this.managedEntities = entities.reduce((map, {name, schema}) => {
      map[name] = schema;
      return map;
    }, {});
    this.identityMaps = new Map();
    this.newEntities = new Set();
    this.removedEntities = new Set();
    return this;
  },

  getIdentityMap(type) {
    if (!this.identityMaps.has(type)) this.identityMaps.set(type, new Map());
    return this.identityMaps.get(type);
  },

  getAndValidateEntityType(entity) {
    const type = getEntityType(entity);
    if (!this.managedEntities[type]) throw Error('No schema for entity type');
    return type;
  },

  isRegistered(entity) {
    if (!entity.id) return false;
    const type = this.getAndValidateEntityType(entity);
    const observer = this.getIdentityMap(type).get(entity.id);
    return (observer && observer.isObserving(entity));
  },

  registerNew(entity) {
    if (!entity) throw Error('No entity provided');
    if (entity.id) throw Error('Entity is already identifiable');
    const type = this.getAndValidateEntityType(entity);
    const observer = observeEntity(this.managedEntities[type], entity);
    this.newEntities.add(observer);
    return observer.proxy;
  },

  registerClean(entity) {
    if (!entity) throw Error('No entity provided');
    if (!entity.id) throw Error('Entity is unidentifiable');
    if (this.isRegistered(entity)) throw Error('Entity is already registered');
    const type = getEntityType(entity);
    const observer = observeEntity(this.managedEntities[type], entity);
    this.getIdentityMap(type).set(entity.id, observer);
    return observer.proxy;
  },

  registerRemoved(entity) {
    if (!entity) throw Error('No entity provided');
    if (!entity.id) throw Error('Entity is unidentifiable');
    if (!this.isRegistered(entity)) throw Error('Entity is not registered');
    if (this.newEntities.delete(entity)) return;
    this.removedEntities.add(entity);
  },

  // TODO: need topological sort before performing operations
  flush() {
    let {preFlush = () => Promise.resolve({}), postFlush = () => {}} = this.mapper;
    postFlush = postFlush.bind(this.mapper);
    return preFlush.call(this.mapper)
        .then(insertNewEntities.bind(undefined, this.newEntities, this.mapper))
        .then(updateDirtyEntities.bind(undefined, this.identityMaps, this.mapper))
        .then(deleteRemovedEntities.bind(undefined, this.removedEntities, this.mapper))
        .then(() => {
          this.newEntities.forEach(observer => {
            observer.clear();
            const {entity} = observer;
            const type = getEntityType(entity);
            this.getIdentityMap(type).set(entity.id, observer);
          });
          this.newEntities.clear();
          this.identityMaps.forEach(registeredEntities => registeredEntities.forEach(observer => observer.clear()));
          this.removedEntities.clear();
        })
        .then(postFlush)
        .catch(postFlush);
  },

  clear() {
    this.newEntities.clear();
    this.identityMaps.clear();
    this.removedEntities.clear();
  }
};

function createUnitOfWork(entities, mapper) {
  return Object.create(UnitOfWork).init(entities, mapper);
}

export default createUnitOfWork;
