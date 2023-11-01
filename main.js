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

function map(x) {
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
          subpath.unshift(k);
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

var PouchDB = require("pouchdb");
PouchDB.plugin(require("pouchdb-adapter-memory"));

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
db.put(ddoc).then(function () {
  // success!
}).catch(function (err) {
  // some error (maybe a 409, because it already exists?)
});

db.put(doc).catch((ex) => {
  console.log(ex.status);
});

// Query for exact matches on the Rhodes family
db.query("my_index/gin", {
  key: ["person", "name", "second", "rhodes"],
}).then(function (res) {
  res.rows.forEach((row) => {
    console.log(row);
  });
}).catch(function (err) {
  // some error
});

db.post({ "foo": 12, "bar": "up" });
db.post({ "foo": 22, "bar": "down" });
db.post({ "foo": 32, "bar": "up" });
db.post({ "foo": 42, "bar": "down" });
db.post({ "foo": 42, "bar": "up" });

// Query for foo = 22
db.query("my_index/gin", {
  key: ["foo", 22],
}).then(function (res) {
  res.rows.forEach((row) => {
    console.log(row);
  });
}).catch(function (err) {
  // some error
});

// Query for foo >= 22
db.query("my_index/gin", {
  startkey: ["foo", 22],
  endkey: ["foo", {}],
}).then(function (res) {
  res.rows.forEach((row) => {
    console.log(row);
  });
}).catch(function (err) {
  // some error
});

// A simple AND foo >= 22 and bar = up
