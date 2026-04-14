# Effective Java — 3rd Edition

**Joshua Bloch, Addison-Wesley (2018)**

The definitive guide to writing robust, flexible, and maintainable Java code. Joshua Bloch — former Chief Java Architect at Google and the designer of `java.util.Collections`, `java.math`, and the Java Collections Framework — distills decades of experience into 90 concrete items organized across 11 chapters.

This edition covers **Java 7, 8, and 9**, including lambdas, streams, optionals, default methods in interfaces, try-with-resources, and the module system.

---

## Why This Book Matters for Interviews

- **Language mastery signal**: interviewers expect senior Java developers to know these patterns cold
- **Design discussion fuel**: Items on Builder, Factory Methods, Immutability, and Composition vs Inheritance come up in system design rounds
- **Concurrency depth**: Items 78-84 cover the threading and synchronization questions that separate senior from mid-level candidates
- **API design thinking**: demonstrates the mindset interviewers look for — thinking about contracts, invariants, and failure modes

---

## Chapter Index

### Creating and Destroying Objects

| # | Item | Core Focus |
|---|------|------------|
| 2 | [Creating and Destroying Objects](./02-creating-and-destroying-objects.md) | Static factories, builders, singletons, avoiding unnecessary objects, eliminating obsolete references, try-with-resources |

### Methods Common to All Objects

| # | Item | Core Focus |
|---|------|------------|
| 3 | [Methods Common to All Objects](./03-methods-common-to-all-objects.md) | equals, hashCode, toString, clone, Comparable contracts |

### Classes and Interfaces

| # | Item | Core Focus |
|---|------|------------|
| 4 | [Classes and Interfaces](./04-classes-and-interfaces.md) | Accessibility, immutability, composition over inheritance, interfaces vs abstract classes, design for inheritance |

### Generics

| # | Item | Core Focus |
|---|------|------------|
| 5 | [Generics](./05-generics.md) | Raw types, unchecked warnings, bounded wildcards, type-safe heterogeneous containers, PECS |

### Enums and Annotations

| # | Item | Core Focus |
|---|------|------------|
| 6 | [Enums and Annotations](./06-enums-and-annotations.md) | Enums vs int constants, EnumSet/EnumMap, strategy enum, Override, marker interfaces |

### Lambdas and Streams

| # | Item | Core Focus |
|---|------|------------|
| 7 | [Lambdas and Streams](./07-lambdas-and-streams.md) | Lambdas vs anonymous classes, method references, functional interfaces, Stream API best practices, parallelism pitfalls |

### Methods

| # | Item | Core Focus |
|---|------|------------|
| 8 | [Methods](./08-methods.md) | Parameter validation, defensive copies, method signatures, overloading, varargs, Optional return types |

### General Programming

| # | Item | Core Focus |
|---|------|------------|
| 9 | [General Programming](./09-general-programming.md) | Local variables, for-each, library usage, string concatenation, interface types, reflection, native methods |

### Exceptions

| # | Item | Core Focus |
|---|------|------------|
| 10 | [Exceptions](./10-exceptions.md) | Checked vs unchecked, standard exceptions, abstraction-appropriate exceptions, failure atomicity |

### Concurrency

| # | Item | Core Focus |
|---|------|------------|
| 11 | [Concurrency](./11-concurrency.md) | Synchronization, volatile, executors, tasks, concurrent collections, thread safety documentation |

### Serialization

| # | Item | Core Focus |
|---|------|------------|
| 12 | [Serialization](./12-serialization.md) | Alternatives to Java serialization, Serializable risks, serialization proxies, custom serialized forms |
