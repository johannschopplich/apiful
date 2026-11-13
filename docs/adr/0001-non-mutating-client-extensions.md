# Client extensions are copied, not shared

`with` gives every extended client its own copy of the extension record and points its proxy at the original client, rather than writing into one record shared by the whole chain and wrapping the previous proxy. Each proxy targets the original client because a wrapped proxy re-enters the one below it on every trap: a property read through nested proxies cost `2.2 µs` at four extensions and `41 µs` at eight, while a single hop keeps it at `23 ns` however long the chain is. `with` copies the record because a shared one reads like a caching optimization but lets `with` rewrite the client it was called on, where a copy makes `with` return a new client and leave its receiver as it was, as [how extensions work](../guide/how-extensions-work.md) describes.

## Consequences

A handler extension's own properties survive a later `with`, since the proxy asks the handler for every name the record and the base client do not answer. Copying the record costs one pass over the extension names per `with` call, paid once when the client is built.
