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
// eqQuery queries our general index (gin) for
// a field with a specific value. Use dotted field
// for deep query.
eqQuery = async function (field, value) {
  const key = field.split(".").map((x) => fk(x));
  key.push(value);
  // console.log(key);

  const res = await db.query("my_index/gin", {
    key: key,
  });
  // res.rows.forEach((row) => {
  //   console.log(row);
  // });
  return res.rows.map((x) => x["id"]);
};

gteQuery = async function (field, value) {
  startkey = field.split(".").map((x) => fk(x));
  startkey.push(value);
  endkey = field.split(".").map((x) => fk(x));
  endkey.push({});

  // console.log(startkey);
  // console.log(endkey);

  const res = await db.query("my_index/gin", {
    startkey: startkey,
    endkey: endkey,
  });
  // res.rows.forEach((row) => {
  //   console.log(row);
  // });
  return res.rows.map((x) => x["id"]);
};

db.put(doc).catch((ex) => {
  console.log(ex.status);
});

eqQuery("person.name.second", "rhodes").then((people) => {
  console.log("Query for exact matches on the Rhodes family");
  console.log(people);
});

db.post({ "_id": "foo12BarUp", "foo": 12, "bar": "up" });
db.post({ "_id": "foo22BarDown", "foo": 22, "bar": "down" });
db.post({ "_id": "foo32BarUp", "foo": 32, "bar": "up" });
db.post({ "_id": "foo42BarDown", "foo": 42, "bar": "down" });
db.post({ "_id": "foo52BarUp", "foo": 52, "bar": "up" });

eqQuery("foo", 22).then((results) => {
  console.log("Query for exact matches on foo = 22");
  console.log(results);
});

gteQuery("foo", 22).then((results) => {
  console.log("Query for matches on foo >= 22");
  console.log(results);
});

fooAndBar = async function () {
  const fooIds = await gteQuery("foo", 22);
  const barIds = new Set(await eqQuery("bar", "up"));

  const intersection = fooIds.filter((x) => barIds.has(x));

  return intersection;
};
fooAndBar().then((results) => {
  console.log("A simple AND foo >= 22 and bar = up");
  console.log(results);
});

fooOrBar = async function () {
  const fooIds = await gteQuery("foo", 42);
  const barIds = await eqQuery("bar", "up");

  const union = new Set(fooIds);
  barIds.forEach((x) => union.add(x));

  return union;
};
fooOrBar().then((results) => {
  console.log("A simple OR foo >= 42 OR bar = up");
  console.log(results);
});
