import {Entity, ElementCollectionType} from '../Entity';
import EntityObserver from './EntityObserver';

function observeElements(type: ElementCollectionType, collection: any[]) {
  // entity types are root aggregates so not interested in tracking updates via collection, they will be tracked elsewhere
  const schema = (<any>type.element).schema;
  return schema.type === 'entity' ? [] : collection.map((element: any, index: number) => {
    const observer = new EntityObserver(schema, element);
    collection[index] = observer.proxy;
    return observer;
  })
}

type TrackElementHandler = (element: Entity) => void;

function createProxy(collection: any[], addElement: TrackElementHandler, removeElement: TrackElementHandler) {
  return new Proxy(collection, {
    set: (target: any, index: number | string, value) => {
      const element = target[index];
      if (index !== 'length') {
        if (index in target && element !== value) removeElement(element);
        if (!(index in target) || element !== value) addElement(value);
      }
      return Reflect.set(target, index, value);
    },

    deleteProperty: (target, index) => {
      if (index in target) removeElement(target[index]);
      return Reflect.deleteProperty(target, index);
    }
  });
}

class CollectionObserver {

  private elements: EntityObserver[];
  public proxy: [];
  private added: Entity[] = [];
  private removed: Entity[] = [];

  constructor(type: ElementCollectionType, collection: []) {
    this.elements = observeElements(type, collection);
    this.proxy = createProxy(collection, this.addElement.bind(this), this.removeElement.bind(this));
  }

  addElement(value: Entity) {
    const removedIndex = this.removed.indexOf(value);
    if (removedIndex !== -1) this.removed.splice(removedIndex, 1);
    else this.added.push(value);
  }

  removeElement(element: Entity) {
    const addedIndex = this.added.indexOf(element);
    if (addedIndex !== -1) this.added.splice(addedIndex, 1);
    else this.removed.push(element);
  }

  isDirty() {
    return !!(this.added.length + this.removed.length + this.elements.filter(observer => observer.isDirty()).length);
  }

  clear() {
    this.added = [];
    this.removed = [];
    this.elements.forEach(observer => observer.clear());
  }

  changed() {
    return {
      added: this.added,
      updated: this.elements.filter(observer => observer.isDirty()),
      removed: this.removed
    };
  }

}

export default CollectionObserver;
