import EntityManager from './EntityManager';
import {Mapper} from './mapper/Mapper';
import {EntityType, Entity} from './Entity';

function junction(entities: EntityType<Entity>[], mapper: Mapper) {
  return new EntityManager(entities, mapper);
}

export default junction;
