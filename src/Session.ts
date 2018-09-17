import UnitOfWork from './UnitOfWork';
import EntityObserver from './observer/EntityObserver';
import {Entity} from './Entity';

class Session {

  constructor(private uow: UnitOfWork) {
    this.uow = uow;
  }

  add(entity: Entity) {
    this.uow.registerNew(entity);
  }

  remove(entity: Entity) {
    this.uow.registerRemoved(entity);
  }

  track(entity: Entity) {
    return this.uow.registerClean(entity);
  }

  has(type: string, id: number) {
    return this.uow.getIdentityMap(type).has(id);
  }

  retrieve(type: string, id: number) {
    if (!this.has(type, id)) throw Error('Entity has not been tracked');
    const observer = this.uow.getIdentityMap(type).get(id) as EntityObserver;
    return observer.proxy;
  }

  flush() {
    return this.uow.flush();
  }

}

export default Session;
