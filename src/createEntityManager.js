import startSession from './startSession';
import createUnitOfWork from './createUnitOfWork';

const EntityManager = {
  init(entities, mapper) {
    this.entities = entities;
    this.mapper = mapper;
    return this;
  },

  session() {
    return startSession(createUnitOfWork(this.entities, this.mapper));
  }
};

function createEntityManager(entities, mapper) {
  return Object.create(EntityManager).init(entities, mapper);
}

export default createEntityManager;
