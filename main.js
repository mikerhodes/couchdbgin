doc = {
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

// paths returns an array of arrays of the ["key", "path", "value"]
// for the value x passed in.
function paths(x) {
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
      const v = paths(x[k]);
      v.forEach((subpath) => {
        subpath.unshift(k);
        r.push(subpath);
      });
    });
    return r;
  }
}

// result = paths({ "a": 12, "b": "foo", "c": true });
// result = paths({ "a": { "b": "foo" } });
// result = paths({ "a": { "b": "foo", "c": true } });
// result = paths({ "a": ["zero", 1, "foo", true, 4, "last"] });
const result = paths(doc);
result.forEach((x) => {
  console.log("emit(", x, ", null)");
});
