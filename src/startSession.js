export function Session(uow) {
  this.uow = uow;
}

Session.prototype = {
  add(entity) {
    this.uow.registerNew(entity);
  },

  remove(entity) {
    this.uow.registerRemoved(entity);
  },

  track(entity) {
    return this.uow.registerClean(entity);
  },

  has(type, id) {
    return this.uow.getIdentityMap(type).has(id);
  },

  retrieve(type, id) {
    if (!this.has(type, id)) throw Error('Entity has not been tracked');
    return this.uow.getIdentityMap(type).get(id).proxy;
  },

  flush() {
    return this.uow.flush();
  }
};

function startSession(uow) {
  return new Session(uow);
}

export default startSession;
