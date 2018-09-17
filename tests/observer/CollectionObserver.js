import test from 'tape';
import testWithProvision from 'tape-pencil';
import CollectionObserver from '../../src/observer/CollectionObserver';

class SimpleEmbedded {
  constructor(foo, bar) {
    this.foo = foo;
    this.bar = bar;
  }
}
SimpleEmbedded.schema = {
  type: 'embedded',
  props: {
    foo: {type: 'string'},
    bar: {type: 'string'}
  }
};
const collectionSchema = {
  element: SimpleEmbedded
};

class SimpleEntity {
  constructor(foo, bar) {
    this.foo = foo;
    this.bar = bar;
  }
}
SimpleEntity.schema = {
  type: 'entity',
  props: {
    foo: {type: 'string'},
    bar: {type: 'string'}
  }
};
const entityCollectionSchema = {
  element: SimpleEntity
};

function observer() {
  const collection = [new SimpleEmbedded('hello', 'world'), new SimpleEmbedded('foo', 'bar')];
  const observer = new CollectionObserver(collectionSchema, collection);
  return [observer, observer.proxy];
}

function testAddingElement(method) {
  return (t, observer, collection) => {
    const element = new SimpleEmbedded();
    collection[method](element);
    t.ok(observer.isDirty(), 'Collection is dirty on element addition');
    const changed = observer.changed();
    t.equal(changed.added.length, 1, 'Only one added element');
    t.equal(changed.updated.length + changed.removed.length, 0, 'No updates or removals');
    t.notEqual(changed.added.indexOf(element), -1, 'Element is listed in added list');
    t.end();
  };
}

function testRemovingElement(removeFn) {
  return (t, observer, collection) => {
    const removed = removeFn(collection);
    t.ok(observer.isDirty(), 'Collection is dirty on element removal');
    const changed = observer.changed();
    t.equal(changed.removed.length, 1, 'Only one removed element');
    t.equal(changed.updated.length + changed.added.length, 0, 'No updates or additions');
    t.notEqual(changed.removed.indexOf(removed), -1, 'Element is listed in removal list');
    t.end();
  };
}

testWithProvision(
  observer,
  'isDirty() returns false when no collection changes occur',
  (t, observer) => {
    t.notOk(observer.isDirty(), 'Collection is not dirty when nothing has changed');
    t.end();
  }
);

testWithProvision(
  observer,
  'isDirty() returns true when adding new element via push',
  testAddingElement('push')
);
testWithProvision(
  observer,
  'isDirty() returns true when adding new element via unshift',
  testAddingElement('unshift')
);

testWithProvision(
  observer,
  'isDirty() returns true when updating existing element',
  (t, observer, collection) => {
    collection[0].foo = 'updated';
    t.ok(observer.isDirty(), 'Collection is dirty on element update');
    const changed = observer.changed();
    t.equal(changed.updated.length, 1, 'Only one updated element');
    t.equal(changed.added.length + changed.removed.length, 0, 'No additions or removals');
    t.ok(
      changed.updated.find(observer => observer.isObserving(collection[0])),
      'Element is listed in updated list'
    );
    t.end();
  }
);

testWithProvision(
  observer,
  'isDirty() returns true when removing element via splice',
  testRemovingElement(collection => collection.splice(1, 1).pop())
);
testWithProvision(
  observer,
  'isDirty() returns true when removing element via pop',
  testRemovingElement(collection => collection.pop())
);
testWithProvision(
  observer,
  'isDirty() returns true when removing element via shift',
  testRemovingElement(collection => collection.shift())
);

testWithProvision(
  observer,
  'isDirty() returns true when replacing existing element',
  (t, observer, collection) => {
    const element = new SimpleEmbedded();
    const removed = collection[0];
    collection[0] = element;
    t.ok(observer.isDirty(), 'Collection is dirty on element replace');
    const changed = observer.changed();
    t.equal(changed.added.length, 1, 'Only one added element');
    t.notEqual(changed.added.indexOf(element), -1, 'Element is listed in added list');
    t.equal(changed.updated.length, 0, 'No updates');
    t.equal(changed.removed.length, 1, 'Only one removed element');
    t.notEqual(changed.removed.indexOf(removed), -1, 'Element is listed in removal list');
    t.end();
  }
);

testWithProvision(
  observer,
  'isDirty() returns false when replacing element with itself',
  (t, observer, collection) => {
    collection[0] = collection[0];
    t.notOk(observer.isDirty(), 'Collection is not dirty when nothing has changed');
    t.end();
  }
);

testWithProvision(
  observer,
  'isDirty() returns false when deleting then adding the same element',
  (t, observer, collection) => {
    const element = collection[1];
    collection.splice(1, 1);
    collection.push(element);
    t.notOk(
      observer.isDirty(),
      'Collection is not dirty when deleting then adding the same element'
    );
    t.end();
  }
);

testWithProvision(
  observer,
  'isDirty() returns false when reversing collection',
  (t, observer, collection) => {
    collection.reverse();
    t.notOk(observer.isDirty(), 'Collection is not dirty when reversed');
    t.end();
  }
);

testWithProvision(
  observer,
  'isDirty() returns false when sorting collection',
  (t, observer, collection) => {
    collection.sort();
    t.notOk(observer.isDirty(), 'Collection is not dirty when sorted');
    t.end();
  }
);

testWithProvision(observer, 'clear() removes any tracked changes', (t, observer, collection) => {
  const element = new SimpleEmbedded();
  collection.push(element);
  collection[0].foo = 'updated';
  collection.splice(1, 1);
  observer.clear();
  t.notOk(observer.isDirty(), 'Collection is not dirty when mods are cleared');
  t.end();
});

test('isDirty() returns false when updating entity type in collection', t => {
  const collection = [new SimpleEntity('hello', 'world'), new SimpleEntity('foo', 'bar')];
  const observer = new CollectionObserver(entityCollectionSchema, collection);
  collection[0].foo = 'updated';
  t.notOk(observer.isDirty(), 'Collection is not dirty when entity elements are updated');
  t.end();
});
