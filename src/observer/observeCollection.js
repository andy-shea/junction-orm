function observeElements(schema, collection, observeEntity) {
  // entity types are root aggregates so not interested in tracking updates via collection, they will be tracked elsewhere
  return schema.element.schema.type === 'entity' ? [] : collection.map((element, index) => {
    const observer = observeEntity(schema.element.schema, element);
    collection[index] = observer.proxy;
    return observer;
  })
}

function createProxy(collection, addElement, removeElement) {
  return new Proxy(collection, {
    set: (target, index, value) => {
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

const CollectionObserver = {
  init(schema, collection) {
    if (!schema || !collection) throw Error('Schema and collection must be provided');
    this.added = [];
    this.removed = [];
    this.elements = observeElements(schema, collection, require('./observeEntity'));
    this.proxy = createProxy(collection, this.addElement.bind(this), this.removeElement.bind(this));
    return this;
  },

  addElement(value) {
    const removedIndex = this.removed.indexOf(value);
    if (removedIndex !== -1) this.removed.splice(removedIndex, 1);
    else this.added.push(value);
  },

  removeElement(element) {
    const addedIndex = this.added.indexOf(element);
    if (addedIndex !== -1) this.added.splice(addedIndex, 1);
    else this.removed.push(element);
  },

  isDirty() {
    return !!(this.added.length + this.removed.length + this.elements.filter(observer => observer.isDirty()).length);
  },

  clear() {
    this.added = [];
    this.removed = [];
    this.elements.forEach(observer => observer.clear());
  },

  changed() {
    return {
      added: this.added,
      updated: this.elements.filter(observer => observer.isDirty()),
      removed: this.removed
    };
  }
};

function observeCollection(schema, collection) {
  return Object.create(CollectionObserver).init(schema, collection);
}

export default observeCollection;
