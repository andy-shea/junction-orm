import {EntityType, Entity} from './Entity';
import Session from './Session';
import UnitOfWork from './UnitOfWork';
import {Mapper} from './mapper/Mapper';

class EntityManager {

  constructor(private entities: EntityType<Entity>[], private mapper: Mapper) {
    this.entities = entities;
    this.mapper = mapper;
  }

  session() {
    return new Session(new UnitOfWork(this.entities, this.mapper));
  }

}

export default EntityManager;
