import startSession from './startSession';
import unitOfWork from './unitOfWork';

const EntityManager = {
  session() {
    return startSession(unitOfWork(this.entities, this.mapper));
  }
};

function entityManager(entities, mapper) {
  return Object.assign(Object.create(EntityManager), {entities, mapper});
}

export default entityManager;
