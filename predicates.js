// fk creates a "field key" for the index, which is an
// object that sorts after any values a matching field
// prefix may have.
const fk = function (x) {
  const fieldKey = {};
  fieldKey[x] = null;
  return fieldKey;
};

// eqPredicate queries our general index (gin) for
// a field with a specific value. Use dotted field
// for deep query. It assumes the "my_index/gin"
// index above.
export class eqPredicate {
  constructor(field, value) {
    // const self = this;
    this.field = field;
    this.value = value;

    this.execute = async function (db) {
      const key = field.split(".").map((x) => fk(x));
      key.push(value);

      const res = await db.query("my_index/gin", {
        key: key,
      });
      return res.rows.map((x) => x["id"]);
    };
  }
}
// gtePredicate can execute a greater-than-or-equal-to
// query on the database. It assumes the "my_index/gin"
// index above.
export class gtePredicate {
  constructor(field, value) {
    // const self = this;
    this.field = field;
    this.value = value;

    this.execute = async function (db) {
      const startkey = field.split(".").map((x) => fk(x));
      startkey.push(value);
      const endkey = field.split(".").map((x) => fk(x));
      endkey.push({});

      const res = await db.query("my_index/gin", {
        startkey: startkey,
        endkey: endkey,
      });
      return res.rows.map((x) => x["id"]);
    };
  }
}
