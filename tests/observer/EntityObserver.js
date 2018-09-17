import test from 'tape';
import testWithProvision from 'tape-pencil';
import EntityObserver from '../../src/observer/EntityObserver';

class SimpleProps {
  constructor(foo, bar) {
    this.foo = foo;
    this.bar = bar;
  }
}
const schema = {
  type: 'entity',
  props: {
    foo: {type: 'string'},
    bar: {type: 'string'}
  }
};

function observer() {
  const entity = new SimpleProps('hello', 'world');
  const observer = new EntityObserver(schema, entity);
  return [observer, observer.proxy, entity];
}

testWithProvision(
  observer,
  'isObserving() returns true when passed the entity observed',
  (t, observer, proxy, entity) => {
    t.ok(observer.isObserving(entity), 'Observer observes the given entity');
    t.end();
  }
);

testWithProvision(observer, 'isDirty() returns false when no prop changes occur', (t, observer) => {
  t.notOk(observer.isDirty(), 'Entity is not dirty when nothing has changed');
  t.end();
});

testWithProvision(observer, 'isDirty() returns true when prop changes', (t, observer, entity) => {
  entity.foo = 'updated';
  t.ok(observer.isDirty(), 'Entity is dirty on changed prop');
  const changed = observer.changed();
  t.equal(changed.props.length, 1, 'Only one changed prop');
  t.notEqual(changed.props.indexOf('foo'), -1, 'Prop is listed in changed props');
  t.end();
});

testWithProvision(
  observer,
  'isDirty() returns true when prop is deleted',
  (t, observer, entity) => {
    delete entity.foo;
    t.ok(observer.isDirty(), 'Entity is dirty on deleted prop');
    const changed = observer.changed();
    t.equal(changed.props.length, 1, 'Only one changed prop');
    t.notEqual(changed.props.indexOf('foo'), -1, 'Prop is listed in changed props');
    t.end();
  }
);

testWithProvision(
  observer,
  'isDirty() returns true when multiple prop changes',
  (t, observer, entity) => {
    entity.foo = 'updated';
    delete entity.bar;
    t.ok(observer.isDirty(), 'Entity is dirty on changed props');
    const changed = observer.changed();
    t.equal(changed.props.length, 2, 'Two changed props listed');
    t.notEqual(changed.props.indexOf('foo'), -1, '"foo" is listed in changed props');
    t.notEqual(changed.props.indexOf('bar'), -1, '"bar" is listed in changed props');
    t.end();
  }
);

testWithProvision(observer, 'clear() removes any tracked updates', (t, observer, entity) => {
  entity.foo = 'updated';
  observer.clear();
  t.notOk(observer.isDirty(), 'Entity is not dirty when updates are cleared');
  t.end();
});
