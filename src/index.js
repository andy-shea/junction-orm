import createEntityManager from './createEntityManager';

function junction(entities, mapper) {
  return createEntityManager(entities, mapper);
}

export default junction;
