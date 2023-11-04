const doc = {
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
};

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
db.put(doc);

import { eqPredicate, gtePredicate } from "./predicates.js";

(new eqPredicate("person.name.second", "rhodes")).execute(db).then((people) => {
  console.log("Query for exact matches on the Rhodes family");
  console.log(people);
});

db.post({ "_id": "foo12BarUp", "foo": 12, "bar": "up" });
db.post({ "_id": "foo22BarDown", "foo": 22, "bar": "down" });
db.post({ "_id": "foo22BarUp", "foo": 22, "bar": "up" });
db.post({ "_id": "foo32BarUp", "foo": 32, "bar": "up" });
db.post({ "_id": "foo42BarDown", "foo": 42, "bar": "down" });
db.post({ "_id": "foo52BarUp", "foo": 52, "bar": "up" });

(new eqPredicate("foo", 22)).execute(db).then((results) => {
  console.log("Query for exact matches on foo = 22");
  console.log(results);
});

(new gtePredicate("foo", 22)).execute(db).then((results) => {
  console.log("Query for matches on foo >= 22");
  console.log(results);
});

//
// AND
//
class And {
  constructor(...preds) {
    const self = this;
    this.preds = preds;
    this.execute = async function (db) {
      const preds = self.preds;
      if (preds.length == 0) {
        return [];
      } else {
        let intersection = await preds[0].execute(db);
        for (const pred of preds.slice(1)) {
          if (intersection.length == 0) {
            // bail early, no chance of results
            return intersection;
          }
          const newIds = new Set(await pred.execute(db));
          intersection = intersection.filter((x) => newIds.has(x));
        }
        return intersection;
      }
    };
  }
}

(new And(
  new gtePredicate("foo", 22),
  new eqPredicate("bar", "up"),
)).execute(db).then((results) => {
  console.log("A simple AND foo >= 22 and bar = up");
  console.log(results.sort());
});

//
// OR
//
class Or {
  constructor(...preds) {
    const self = this;
    this.preds = preds;
    this.execute = async function (db) {
      const union = new Set();
      for (const pred of self.preds) {
        (await pred.execute(db)).forEach((id) => union.add(id));
      }
      return Array.from(union);
    };
  }
}
(new Or(
  new gtePredicate("foo", 42),
  new eqPredicate("bar", "up"),
)).execute(db).then((results) => {
  console.log("A simple OR foo >= 42 OR bar = up");
  console.log(results.sort());
});

//
// Multi-clause query
//
(new And(
  new Or(
    new gtePredicate("foo", 42),
    new eqPredicate("bar", "up"),
  ),
  new And(
    new gtePredicate("foo", 22),
    new eqPredicate("bar", "up"),
  ),
)).execute(db).then((results) => {
  console.log("(foo >= 42 OR bar = up) AND (foo >= 22 AND bar = up)");
  console.log(results);
});
