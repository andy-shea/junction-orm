import {EntityType, Entity, Schema} from './Entity';
import EntityObserver from './observer/EntityObserver';
import Mapper from './mapper/mapper';

function getEntityType(entity: Entity) {
  return entity.constructor.name;
}

interface DirtyEntities {
  [type: string]: Entity[]
}

interface DirtyObservers {
  [type: string]: EntityObserver[]
}

function insertNewEntities(newEntities: EntityObserver[], mapper: Mapper) {
  const added: DirtyEntities = {};
  newEntities.forEach(({entity}) => {
    const type = getEntityType(entity);
    if (!added[type]) added[type] = [];
    added[type].push(entity);
  });
  return mapper.insert(added);
}

function updateDirtyEntities(identityMaps: Map<string, Map<number, EntityObserver>>, mapper: Mapper) {
  const modified: DirtyObservers = {};
  identityMaps.forEach((registeredEntities, type: string) => {
    registeredEntities.forEach((observer: EntityObserver) => {
      if (observer.isDirty()) {
        if (!modified[type]) modified[type] = [];
        modified[type].push(observer);
      }
    });
  });
  return mapper.update(modified);
}

function deleteRemovedEntities(removedEntities: Entity[], mapper: Mapper) {
  const removed: DirtyEntities = {};
  removedEntities.forEach(entity => {
    const type = getEntityType(entity);
    if (!removed[type]) removed[type] = [];
    removed[type].push(entity);
  });
  return mapper.delete(removed);
}

interface ManagedEntities {
  [name: string]: Schema;
}

class UnitOfWork {

  private managedEntities: ManagedEntities;
  private identityMaps = new Map<string, Map<number, EntityObserver>>();
  private newEntities = new Set<EntityObserver>();
  private removedEntities = new Set();

  constructor(entityTypes: EntityType<Entity>[], private mapper: Mapper) {
    this.mapper = mapper;
    this.managedEntities = entityTypes.reduce((map: ManagedEntities, {name, schema}) => {
      if (!schema) throw new Error(`Missing schema from class: ${name}`);
      map[name] = schema;
      return map;
    }, {});
  }

  getIdentityMap(type: string): Map<number, EntityObserver> {
    if (!this.identityMaps.has(type)) this.identityMaps.set(type, new Map());
    return this.identityMaps.get(type) as Map<number, EntityObserver>;
  }

  getAndValidateEntityType(entity: Entity) {
    const type = getEntityType(entity);
    if (!this.managedEntities[type]) throw Error('No schema for entity type');
    return type;
  }

  isRegistered(entity: Entity) {
    if (!entity.id) return false;
    const type = this.getAndValidateEntityType(entity);
    const observer = this.getIdentityMap(type).get(entity.id);
    return (observer && observer.isObserving(entity));
  }

  registerNew(entity: Entity) {
    if (entity.id) throw Error('Entity is already identifiable');
    const type = this.getAndValidateEntityType(entity);
    const observer = new EntityObserver(this.managedEntities[type], entity);
    this.newEntities.add(observer);
    return observer.proxy;
  }

  registerClean(entity: Entity) {
    if (!entity.id) throw Error('Entity is unidentifiable');
    if (this.isRegistered(entity)) throw Error('Entity is already registered');
    const type = getEntityType(entity);
    const observer = new EntityObserver(this.managedEntities[type], entity);
    this.getIdentityMap(type).set(entity.id, observer);
    return observer.proxy;
  }

  registerRemoved(entity: Entity) {
    // TODO: why check if registered? a newly added entity can be immediately deleted before 
    // it's persisted
    if (!this.isRegistered(entity)) throw Error('Entity is not registered');
    // TODO: this needs to be updated so it searches through all newly added observers for entity
    // if (this.newEntities.delete(entity)) return;
    this.removedEntities.add(entity);
  }

  // TODO: need topological sort before performing operations
  flush() {
    let {
      preFlush = () => Promise.resolve({}),
      postFlush = () => {}
    } = this.mapper;
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
            if (!entity.id) throw Error('Entity is unidentifiable');
            this.getIdentityMap(type).set(entity.id, observer);
          });
          this.newEntities.clear();
          this.identityMaps.forEach(registeredEntities => {
            registeredEntities.forEach((observer: EntityObserver) => observer.clear())
          });
          this.removedEntities.clear();
        })
        .then(postFlush)
        .catch(postFlush);
  }

  clear() {
    this.newEntities.clear();
    this.identityMaps.clear();
    this.removedEntities.clear();
  }

}

export default UnitOfWork;
