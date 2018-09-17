import testWithProvision from 'tape-pencil';
import UnitOfWork from '../src/UnitOfWork';

class Test {
  constructor(id) {
    this.id = id;
  }
}
Test.schema = {
  type: 'entity',
  props: {foo: {type: 'string'}}
};

function createMapper() {
  let id = 1;
  return {
    insert(entityMap) {
      this.inserts = entityMap;
      for (const entities of Object.values(entityMap)) {
        for (const entity of entities) entity.id = id++;
      }
      return Promise.resolve({});
    },

    update(observerMap) {
      this.updates = observerMap;
      return Promise.resolve({});
    },

    delete(entityMap) {
      this.deletes = entityMap;
      return Promise.resolve({});
    }
  };
}

function uow() {
  return [new UnitOfWork([])];
}

function uowWithTestSchema() {
  const mapper = createMapper();
  return [new UnitOfWork([Test], mapper), mapper];
}

function uowWithTestSchemaAndMods() {
  const mapper = createMapper();
  const uow = new UnitOfWork([Test], mapper);
  const updatedEntity = uow.registerClean(new Test(1, 'bar'));
  const removedEntity = uow.registerClean(new Test(2));
  const newEntity = uow.registerNew(new Test());
  uow.registerRemoved(removedEntity);
  updatedEntity.foo = 'bar';
  return [uow, mapper, updatedEntity, removedEntity, newEntity];
}

function testErrorOnMissingEntitySchema(registerFunctionName, entity) {
  return (t, uow) => {
    t.throws(
      uow[registerFunctionName].bind(uow, entity),
      /No schema for entity type/,
      'Errors when UoW is not initialised with entity schema'
    );
    t.end();
  };
}

function testErrorOnMissingId(registerFunctionName) {
  return (t, uow) => {
    t.throws(
      uow[registerFunctionName].bind(uow, new Test()),
      /Entity is unidentifiable/,
      'Errors when entity is not identifiable'
    );
    t.end();
  };
}

testWithProvision(
  uow,
  'registerNew() errors if UoW is not initialised with entity schema',
  testErrorOnMissingEntitySchema('registerNew', new Test())
);
testWithProvision(uowWithTestSchema, 'registerNew() errors if entity has an ID', (t, uow) => {
  const entity = new Test();
  entity.id = 1;
  t.throws(
    uow.registerNew.bind(uow, entity),
    /Entity is already identifiable/,
    'Errors when entity already has an ID'
  );
  t.end();
});
testWithProvision(
  uowWithTestSchema,
  'registerNew() adds entity to new entities list',
  (t, uow, mapper) => {
    const entity = new Test();
    uow.registerNew(entity);
    uow.flush().then(() => {
      t.equals(mapper.inserts['Test'][0], entity, 'Entity passed to mapper');
      t.end();
    });
  }
);

// // TODO: shouldn't need this
// // testWithProvision(
// //   uowWithTestSchema,
// //   'registerRemoved() errors if entity has no ID set',
// //   testErrorOnMissingId('registerRemoved')
// // );
testWithProvision(
  uowWithTestSchema,
  'registerRemoved() errors if entity has not been registered',
  (t, uow) => {
    const entity = new Test();
    entity.id = 1;
    t.throws(
      uow.registerRemoved.bind(uow, entity),
      /Entity is not registered/,
      'Errors when entity has not been registered'
    );
    t.end();
  }
);
testWithProvision(
  uowWithTestSchema,
  'registerRemoved() adds entity to removed entities list',
  (t, uow, mapper) => {
    const entity = new Test();
    entity.id = 1;
    uow.registerClean(entity);
    uow.registerRemoved(entity);
    uow.flush().then(() => {
      t.equals(mapper.deletes['Test'][0], entity, 'Entity passed to mapper');
      t.end();
    });
  }
);

testWithProvision(
  uow,
  'registerClean() errors if entity has no ID set',
  testErrorOnMissingId('registerClean')
);
testWithProvision(
  uow,
  'registerClean() errors if UoW is not initialised with entity schema',
  testErrorOnMissingEntitySchema('registerClean', new Test(1))
);
testWithProvision(uowWithTestSchema, 'registerClean() errors if entity has no ID set', (t, uow) => {
  t.throws(
    uow.registerClean.bind(uow, new Test()),
    /Entity is unidentifiable/,
    'Errors when entity is not identifiable'
  );
  t.end();
});
testWithProvision(
  uowWithTestSchema,
  'registerClean() errors if entity has already been registered',
  (t, uow, mapper) => {
    const entity = new Test(1);
    uow.registerClean(entity);
    t.throws(
      uow.registerClean.bind(uow, entity),
      /Entity is already registered/,
      'Errors when entity has already been registered'
    );
    t.end();
  }
);

testWithProvision(uowWithTestSchemaAndMods, 'clear() clears all entity lists', (t, uow, mapper) => {
  uow.clear();
  uow.flush().then(() => {
    t.equal(Object.keys(mapper.inserts).length, 0, 'No entity inserts');
    t.equal(Object.keys(mapper.updates).length, 0, 'No entity updates');
    t.equal(Object.keys(mapper.deletes).length, 0, 'No entity deletes');
    t.end();
  });
});

testWithProvision(uowWithTestSchemaAndMods, 'flush() clears all modified', (t, uow, mapper) => {
  uow
    .flush()
    .then(() => uow.flush())
    .then(() => {
      t.equal(Object.keys(mapper.inserts).length, 0, 'No entity inserts');
      t.equal(Object.keys(mapper.updates).length, 0, 'No entity updates');
      t.equal(Object.keys(mapper.deletes).length, 0, 'No entity deletes');
      t.end();
    });
});

testWithProvision(
  uowWithTestSchemaAndMods,
  'flush() registers new inserts as clean for further update tracking',
  (t, uow, mapper, updatedEntity, removedEntity, newEntity) => {
    uow
      .flush()
      .then(() => {
        newEntity.foo = 'updated';
        return uow.flush();
      })
      .then(() => {
        t.equal(Object.keys(mapper.inserts).length, 0, 'No entity inserts');
        t.equal(Object.keys(mapper.updates).length, 1, 'Only one updated entity');
        t.ok(mapper.updates['Test'][0].isObserving(newEntity), 'Entity is in updates list');
        t.equal(Object.keys(mapper.deletes).length, 0, 'No entity deletes');
        t.end();
      });
  }
);
