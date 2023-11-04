// fk creates a "field key" for the index, which is an
// object that sorts after any values a matching field
// prefix may have.
const fk = function (x) {
  const fieldKey = {};
  fieldKey[x] = null;
  return fieldKey;
};

function map(x) {
  // Duplicate the fk function so can be used from the PouchDB
  // context.
  const fk = function (x) {
    const fieldKey = {};
    fieldKey[x] = null;
    return fieldKey;
  };
  // paths returns an array of arrays of the ["key", "path", "value"]
  // for the value x passed in.
  const paths = function (x) {
    if (x === null) {
      return [[x]];
    }
    if (x.constructor === String) {
      return [[x]];
    }
    if (x.constructor === Number) {
      return [[x]];
    }
    if (x.constructor === Boolean) {
      return [[x]];
    }

    if (x.constructor === Array) {
      const r = [];
      for (let i = 0; i < x.length; i++) {
        const v = paths(x[i]);
        v.forEach((subpath) => {
          subpath.unshift(i);
          r.push(subpath);
        });
      }
      return r;
    }

    if (x.constructor === Object) {
      const r = [];
      Object.keys(x).forEach((k) => {
        if (k.startsWith("_")) return;
        const v = paths(x[k]);
        v.forEach((subpath) => {
          // fields are objects in indexes
          subpath.unshift(fk(k));
          r.push(subpath);
        });
      });
      return r;
    }
  };

  const result = paths(x);
  result.forEach((x) => {
    emit(x, null);
  });
}

function emit(key, value) {
  console.log("emit(", key, ", " + value + ")");
}

// map({ "a": 12, "b": "foo", "c": true });
// map({ "a": { "b": "foo" } });
// map({ "a": { "b": "foo", "c": true } });
// map({ "a": ["zero", 1, "foo", true, 4, "last"] });
// map(doc);

import test from "node:test";
import assert from "node:assert";

import PouchDB from "pouchdb";
import MemoryAdapterPlugin from "pouchdb-adapter-memory";
PouchDB.plugin(MemoryAdapterPlugin);

var db = new PouchDB("kittens", { adapter: "memory" });

// document that tells PouchDB/CouchDB
// to build up an index on doc.name
var ddoc = {
  _id: "_design/my_index",
  views: {
    gin: {
      map: map.toString(),
    },
  },
};
// save it
db.put(ddoc);

import { And, eqPredicate, gtePredicate, Or } from "./predicates.js";

test("people", async (t) => {
  await db.put({
    "_id": "234-23423-efsd-234",
    "person": {
      "age": 12,
      "name": { "first": "mike", "second": "rhodes", "words": true },
    },
    "address": {
      "number": 12,
      "firstline": "foo road",
      "secondline": "fooland",
      "postcode": "foo 123",
    },
    "pets": ["alice", "bob", "eve"],
  });

  await t.test("person.name.second = rhodes", async (t) => {
    const expected = ["234-23423-efsd-234"];
    const got = await (new eqPredicate("person.name.second", "rhodes")).execute(
      db,
    );
    assert.deepEqual(got.sort(), expected);
  });

  await t.test("person.name.first = rhodes", async (t) => {
    const expected = [];
    const got = await (new eqPredicate("person.name.first", "rhodes")).execute(
      db,
    );
    assert.deepEqual(got.sort(), expected);
  });
});

test("foo bar tests", async (t) => {
  await db.post({ "_id": "foo12BarUp", "foo": 12, "bar": "up" });
  await db.post({ "_id": "foo22BarDown", "foo": 22, "bar": "down" });
  await db.post({ "_id": "foo22BarUp", "foo": 22, "bar": "up" });
  await db.post({ "_id": "foo32BarUp", "foo": 32, "bar": "up" });
  await db.post({ "_id": "foo42BarDown", "foo": 42, "bar": "down" });
  await db.post({ "_id": "foo52BarUp", "foo": 52, "bar": "up" });

  await t.test("foo = 22", async (t) => {
    const expected = ["foo22BarDown", "foo22BarUp"];
    const got = await (new eqPredicate("foo", 22)).execute(db);
    assert.deepEqual(got.sort(), expected);
  });

  await t.test("foo >= 22", async (t) => {
    const expected = [
      "foo22BarDown",
      "foo22BarUp",
      "foo32BarUp",
      "foo42BarDown",
      "foo52BarUp",
    ];
    const got = await (new gtePredicate("foo", 22)).execute(db);
    assert.deepEqual(got.sort(), expected);
  });

  await t.test("basic AND test", async (t) => {
    const expected = ["foo22BarUp", "foo32BarUp", "foo52BarUp"];
    const got = await (new And(
      new gtePredicate("foo", 22),
      new eqPredicate("bar", "up"),
    )).execute(db);
    assert.deepEqual(got.sort(), expected);
  });

  await t.test("a simple OR foo >= 42 OR bar = up", async (t) => {
    const expected = [
      "foo12BarUp",
      "foo22BarUp",
      "foo32BarUp",
      "foo42BarDown",
      "foo52BarUp",
    ];
    const got = await (new Or(
      new gtePredicate("foo", 42),
      new eqPredicate("bar", "up"),
    )).execute(db);
    assert.deepEqual(got.sort(), expected);
  });

  //
  // Multi-clause query
  //
  await t.test("(foo >= 42 OR bar = up) AND (foo >= 22 AND bar = up)", async (t) => {
    const expected = ["foo52BarUp", "foo22BarUp", "foo32BarUp"];
    const got = await (new And(
      new Or(
        new gtePredicate("foo", 42),
        new eqPredicate("bar", "up"),
      ),
      new And(
        new gtePredicate("foo", 22),
        new eqPredicate("bar", "up"),
      ),
    )).execute(db);
    assert.deepEqual(got, expected);
  });
});
