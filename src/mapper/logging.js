import {inspect} from 'util';

const mapper = {
  insert(entityMap) {
    console.log('INSERT: ', inspect(entityMap, false, null));
    return Promise.resolve({});
  },

  update(observerMap) {
    console.log('UPDATE: ', inspect(observerMap, false, null));
    return Promise.resolve({});
  },

  delete(entityMap) {
    console.log('DELETE: ', inspect(entityMap, false, null));
    return Promise.resolve({});
  }
};

export default mapper;
