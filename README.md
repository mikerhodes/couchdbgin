# CouchDB JSON path Inverted Index Proof of Concept

This proof of concept shows how CouchDB could index every field in a document
into the same index and enable general querying across all the fields in a
Mango-like way, for those operators that the index supports.

The basic idea runs as follows:

1. Index every field in the document as a separate row in a view. Every row
   contains both the path within the JSON and the value at that path as an entry
   in a complex array key in the view.
2. When querying, the query such as `{"a": {"b": {"$eq": "foo"}}}` is converted
   into a path in the index, `["a", "b", "foo"]`. We can then get all the
   documents with that key.

If we adopted the PoC, this could all be hidden inside Mango, but we can
demonstrate this with:

1. A `map` function that emits the path + value as the array appropriately.
2. A client side translation layer that creates the appropriate query(s) on the
   index.

As a more complex example, a query that is of the form `a = foo AND b = bar`,
where `a` and `b` are top level fields in the index, can be carried out with two
queries to the view and the results intersected.

```
ids_a_equals_foo = query_view(["a", "foo"])
ids_b_equals_bar = query_view(["b", "bar"])
result_ids = intersect(ids_a_equals_foo, ids_b_equals_bar)
```

For `OR` queries:

```
ids_a_equals_foo = query_view(["a", "foo"])
ids_b_equals_bar = query_view(["b", "bar"])
result_ids = union(ids_a_equals_foo, ids_b_equals_bar)
```

I think that we can create a query planner that will do a set of different
queries and intersect/union them to support more complex queries like
`a=foo AND (b=bar OR c=baz)`.

I also think that if we use CouchDB's multi-query for views, and do the ordering
appropriately that we would be able to stream this as CouchDB executes the query
and returns the rows to us.

To avoid sorting in memory, we could emit the doc ID at the end of the key. This
would mean that the path + value tuples in the index would be stored in document
ID order.

For supporting range queries, we have the issue that the document IDs won't be
in order, so we'd have to sort them as they arrived for each value in the range
as the query returns values.

To start with, let's support usual queries:

- Equality.
- Greater than.
- Less than.

NOT would be an index scan over the appropriate field, we'd have to either issue
two range queries (less than the value and greater than the value) or just scan
them all and discard client side. But it's definitely possible.

Arrays are more complex. It would be nice to support both "IN" and "AT INDEX"
type queries. We could do this by emitting the array index as part of the key,
which would efficiently support the AT INDEX version. It would support IN
slightly less efficiently as we'd have to scan all the entries in the index for
the array. We'd not be able to stop once we found it, because different
documents might have the value at different array indexes. This is probably
worth it to support the AT INDEX query, if we didn't have the index in the key
we'd not be able to do them at all.

## References

- [Azure Cosmos schema-free indexes](https://www.vldb.org/pvldb/vol8/p1668-shukla.pdf)

-[CockroachDB inverted indexes](https://github.com/cockroachdb/cockroach/blob/master/docs/RFCS/20171020_inverted_indexes.md)
