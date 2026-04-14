# Chapter 12 — C and C++

> C and C++ interview questions test your understanding of memory management, object-oriented features, pointers, and low-level system concepts. These topics are especially common at systems-level companies, game studios, embedded firms, and teams working on performance-critical infrastructure.

---

## Classes and Inheritance

### Access Modifiers

| Modifier | Within Class | Derived Class | Outside |
|----------|:----------:|:------------:|:-------:|
| `public` | ✓ | ✓ | ✓ |
| `protected` | ✓ | ✓ | ✗ |
| `private` | ✓ | ✗ | ✗ |

### Inheritance Syntax

```cpp
class Animal {
public:
    virtual void speak() { cout << "..."; }
    int age;
protected:
    string name;
private:
    int internalId;
};

class Dog : public Animal {
public:
    void speak() override { cout << "Woof!"; }
    void fetch() { cout << name << " fetches!"; }  // can access protected
    // cannot access internalId (private to Animal)
};
```

### Inheritance Access Rules

| Base Member | `public` Inheritance | `protected` Inheritance | `private` Inheritance |
|-------------|:-------------------:|:----------------------:|:--------------------:|
| `public` | `public` | `protected` | `private` |
| `protected` | `protected` | `protected` | `private` |
| `private` | inaccessible | inaccessible | inaccessible |

> Default inheritance is `private` for classes and `public` for structs. Always use `public` inheritance unless you have a specific reason not to — it models the "is-a" relationship.

---

## Constructors and Destructors

### Constructor Types

```cpp
class Person {
    string name;
    int age;
public:
    Person() : name("Unknown"), age(0) {}           // default constructor

    Person(string n, int a) : name(n), age(a) {}    // parameterized

    Person(const Person& other)                      // copy constructor
        : name(other.name), age(other.age) {}

    Person(Person&& other) noexcept                  // move constructor (C++11)
        : name(std::move(other.name)), age(other.age) {}
};
```

### Initializer Lists

Prefer initializer lists over assignment in the constructor body:

```cpp
// Good: initializer list — constructs members directly
Person(string n, int a) : name(n), age(a) {}

// Less efficient: constructs then assigns
Person(string n, int a) {
    name = n;  // default-constructs name, then assigns
    age = a;
}
```

> Initializer lists are **required** for `const` members, reference members, and base class constructors.

### Destructor Order

Destructors are called in the **reverse order** of construction:

```
Construction:   Base → Derived → Member1 → Member2
Destruction:    Member2 → Member1 → Derived → Base
```

```cpp
class Base {
public:
    Base()  { cout << "Base ctor\n"; }
    virtual ~Base() { cout << "Base dtor\n"; }
};

class Derived : public Base {
    string data;
public:
    Derived() : data("hello") { cout << "Derived ctor\n"; }
    ~Derived() { cout << "Derived dtor\n"; }
};

// Output when Derived d; goes out of scope:
// Base ctor
// Derived ctor
// Derived dtor
// Base dtor
```

---

## Virtual Functions

Virtual functions enable **runtime polymorphism** — the correct function is called based on the actual object type, not the pointer/reference type.

### vtable Mechanism

```
┌─────────────────────────────────────────────────────────────┐
│                    HOW VTABLES WORK                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Each class with virtual functions has a vtable              │
│  Each object has a hidden vptr pointing to its class vtable  │
│                                                               │
│  Animal* a = new Dog();                                      │
│  a->speak();   // looks up speak() in Dog's vtable           │
│                                                               │
│  ┌──────────┐     ┌──────────────────┐                       │
│  │  Dog obj  │     │   Dog vtable     │                       │
│  │──────────│     │──────────────────│                       │
│  │  vptr ───│────→│ speak() → Dog::speak                    │
│  │  age     │     │ eat()   → Animal::eat                   │
│  │  breed   │     └──────────────────┘                       │
│  └──────────┘                                                │
│                                                               │
│  ┌──────────┐     ┌──────────────────┐                       │
│  │  Cat obj  │     │   Cat vtable     │                       │
│  │──────────│     │──────────────────│                       │
│  │  vptr ───│────→│ speak() → Cat::speak                    │
│  │  age     │     │ eat()   → Animal::eat                   │
│  │  indoor  │     └──────────────────┘                       │
│  └──────────┘                                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Pure Virtual Functions and Abstract Classes

```cpp
class Shape {
public:
    virtual double area() = 0;     // pure virtual → Shape is abstract
    virtual void draw() = 0;

    double perimeter();            // non-virtual: same for all shapes
    virtual ~Shape() {}
};

class Circle : public Shape {
    double radius;
public:
    Circle(double r) : radius(r) {}
    double area() override { return 3.14159 * radius * radius; }
    void draw() override { /* draw circle */ }
};
```

> You cannot instantiate an abstract class. Any class with at least one pure virtual function is abstract. A derived class must override **all** pure virtual functions to be concrete.

---

## Virtual Destructors

### Why Base Class Destructors Should Be Virtual

```cpp
class Base {
public:
    ~Base() { cout << "Base dtor\n"; }        // NON-virtual: BUG!
};

class Derived : public Base {
    int* data;
public:
    Derived() { data = new int[100]; }
    ~Derived() { delete[] data; cout << "Derived dtor\n"; }
};

Base* b = new Derived();
delete b;  // Only calls ~Base() — memory leak! ~Derived() never runs
```

**Fix:** Make the base destructor virtual:

```cpp
class Base {
public:
    virtual ~Base() { cout << "Base dtor\n"; }  // virtual: correct!
};
```

> **Rule of thumb**: If a class has any virtual function, its destructor should also be virtual. If a class is not designed for inheritance, mark it `final`.

---

## Default Values

```cpp
void printLine(string text, int count = 1, char separator = '-') {
    for (int i = 0; i < count; i++) {
        cout << text << separator;
    }
}

printLine("hello");            // count=1, separator='-'
printLine("hello", 3);         // count=3, separator='-'
printLine("hello", 3, '*');    // count=3, separator='*'
```

> Default parameters are resolved at **compile time** based on the static type, not the dynamic type. Avoid default parameters in virtual functions — they can cause surprising behavior.

---

## Operator Overloading

```cpp
class Complex {
    double real, imag;
public:
    Complex(double r = 0, double i = 0) : real(r), imag(i) {}

    Complex operator+(const Complex& other) const {
        return Complex(real + other.real, imag + other.imag);
    }

    Complex operator-(const Complex& other) const {
        return Complex(real - other.real, imag - other.imag);
    }

    bool operator==(const Complex& other) const {
        return real == other.real && imag == other.imag;
    }

    friend ostream& operator<<(ostream& os, const Complex& c) {
        os << c.real << " + " << c.imag << "i";
        return os;
    }
};
```

### Commonly Overloaded Operators

| Operator | Typical Use | Member or Friend? |
|----------|------------|-------------------|
| `+`, `-`, `*`, `/` | Arithmetic | Either |
| `==`, `!=`, `<`, `>` | Comparison | Member preferred |
| `<<`, `>>` | Stream I/O | Friend (needs `ostream&`) |
| `[]` | Array access | Member |
| `()` | Function call / functor | Member |
| `=` | Assignment | Must be member |
| `++`, `--` | Increment/decrement | Member |

---

## Pointers and References

### Pointers vs. References

| Feature | Pointer | Reference |
|---------|---------|-----------|
| **Syntax** | `int* p = &x;` | `int& r = x;` |
| **Nullable** | Yes (`nullptr`) | No (must bind to object) |
| **Reassignable** | Yes | No (bound at initialization) |
| **Arithmetic** | Yes (`p++`, `p + 5`) | No |
| **Indirection** | Explicit (`*p`) | Implicit (use `r` directly) |
| **Memory** | Holds an address | Alias (may or may not occupy memory) |

```cpp
int x = 10;
int* p = &x;    // pointer to x
int& r = x;     // reference to x

*p = 20;         // x is now 20
r = 30;          // x is now 30

int y = 40;
p = &y;          // p now points to y (valid)
// r = y;        // this assigns y's VALUE to x, doesn't rebind r
```

> **When to use which?**
> - Use references for function parameters and return values when null is not a valid state
> - Use pointers when you need nullability, reassignment, or array arithmetic
> - Use smart pointers for heap-allocated objects with ownership semantics

### Smart Pointers (C++11)

```cpp
#include <memory>

// unique_ptr: exclusive ownership, no copies, auto-deleted
std::unique_ptr<Node> node = std::make_unique<Node>(42);

// shared_ptr: shared ownership via reference counting
std::shared_ptr<Node> a = std::make_shared<Node>(42);
std::shared_ptr<Node> b = a;  // ref count = 2
// deleted when last shared_ptr goes out of scope

// weak_ptr: non-owning observer, breaks circular references
std::weak_ptr<Node> w = a;
if (auto locked = w.lock()) {
    // object still alive, use locked
}
```

| Smart Pointer | Ownership | Copyable | Use Case |
|--------------|-----------|----------|----------|
| `unique_ptr` | Exclusive | No (movable) | Default choice for heap objects |
| `shared_ptr` | Shared (ref-counted) | Yes | Multiple owners of same object |
| `weak_ptr` | None (observer) | Yes | Breaking cycles, caching |

---

## Templates

Templates enable generic programming — writing code that works with any type.

### Function Templates

```cpp
template <typename T>
T maxOf(T a, T b) {
    return (a > b) ? a : b;
}

int x = maxOf(3, 7);           // T = int
double y = maxOf(3.14, 2.72);  // T = double
string z = maxOf<string>("abc", "xyz"); // explicit type
```

### Class Templates

```cpp
template <typename T>
class Stack {
    vector<T> data;
public:
    void push(const T& val) { data.push_back(val); }

    T pop() {
        T top = data.back();
        data.pop_back();
        return top;
    }

    bool isEmpty() const { return data.empty(); }
    int size() const { return data.size(); }
};

Stack<int> intStack;
Stack<string> strStack;
```

### Template Specialization

```cpp
template <typename T>
class Printer {
public:
    void print(const T& val) { cout << val; }
};

template <>
class Printer<bool> {
public:
    void print(const bool& val) { cout << (val ? "true" : "false"); }
};
```

> C++ templates are resolved at **compile time** (monomorphization) — each instantiation generates separate code. Java generics use **type erasure** — a single class is used at runtime. This is a common interview comparison point.

---

## The RAII Pattern

**Resource Acquisition Is Initialization**: tie resource lifetime to object lifetime.

```cpp
class FileHandle {
    FILE* file;
public:
    FileHandle(const char* path) {
        file = fopen(path, "r");
        if (!file) throw runtime_error("Cannot open file");
    }

    ~FileHandle() {
        if (file) fclose(file);
    }

    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
};

void readData() {
    FileHandle fh("data.txt");
    // use fh...
    // fh automatically closed when it goes out of scope,
    // even if an exception is thrown
}
```

> RAII is the foundation of modern C++ resource management. Smart pointers, lock guards, and file streams all use RAII. Never use raw `new`/`delete` in modern C++ — use smart pointers instead.

---

## Move Semantics (C++11)

Move semantics avoid expensive copies by "stealing" resources from temporary objects.

```cpp
class Buffer {
    int* data;
    size_t size;
public:
    Buffer(size_t n) : data(new int[n]), size(n) {}

    // Copy constructor: deep copy (expensive)
    Buffer(const Buffer& other) : data(new int[other.size]), size(other.size) {
        memcpy(data, other.data, size * sizeof(int));
    }

    // Move constructor: steal resources (cheap)
    Buffer(Buffer&& other) noexcept : data(other.data), size(other.size) {
        other.data = nullptr;
        other.size = 0;
    }

    ~Buffer() { delete[] data; }
};

Buffer createBuffer() {
    Buffer b(1000000);
    return b;  // move constructor called (or RVO eliminates copy entirely)
}
```

| Operation | Cost | When Used |
|-----------|------|-----------|
| Copy | O(n) — allocate + copy | Lvalue arguments, explicit copies |
| Move | O(1) — pointer swap | Rvalue (temporary) arguments, `std::move()` |

---

## C++ Memory Model Basics

| Memory Region | What's Stored | Lifetime | Size |
|--------------|--------------|----------|------|
| **Stack** | Local variables, function parameters | Until function returns | Limited (1–8 MB typical) |
| **Heap** | Dynamically allocated (`new`/`malloc`) | Until `delete`/`free` | Limited by OS |
| **Static/Global** | Global variables, static members | Entire program | Fixed at compile time |
| **Code** | Compiled instructions | Entire program | Fixed at compile time |

```
┌──────────────────────────┐  High address
│         Stack            │  ← grows downward
│  (local vars, params)    │
├──────────────────────────┤
│           ↓              │
│      (free space)        │
│           ↑              │
├──────────────────────────┤
│         Heap             │  ← grows upward
│  (dynamic allocation)    │
├──────────────────────────┤
│     Static / Global      │
├──────────────────────────┤
│      Code (Text)         │
└──────────────────────────┘  Low address
```

---

## Interview Questions Overview

| # | Problem | Key Concept |
|---|---------|------------|
| 12.1 | **Last K Lines** | Circular buffer of size K, read file line by line |
| 12.2 | **Reverse String** | In-place swap with two pointers, null terminator handling |
| 12.3 | **Hash Table vs STL Map** | Hash table = O(1) avg, unordered; `map` = O(log n), ordered (red-black tree) |
| 12.4 | **Virtual Functions** | Explain vtable, runtime dispatch, pure virtual |
| 12.5 | **Shallow vs Deep Copy** | Shallow copies pointers; deep copies the pointed-to data |
| 12.6 | **Volatile** | Prevents compiler optimization of variable reads; used for hardware registers, signal handlers |
| 12.7 | **Virtual Base Class** | Solves diamond inheritance problem — ensures single copy of base class |
| 12.8 | **Copy Node** | Deep copy of a linked list with random pointers — use hash map or interleaving technique |
| 12.9 | **Smart Pointer** | Implement a reference-counted smart pointer with constructor, destructor, copy, assignment |
| 12.10 | **Malloc** | Implement aligned memory allocation — allocate extra bytes, store offset, return aligned address |

### Diamond Inheritance Problem

```
        ┌───────┐
        │   A   │
        ├───┬───┤
        ▼       ▼
    ┌───────┐ ┌───────┐
    │   B   │ │   C   │
    └───┬───┘ └───┬───┘
        ▼       ▼
        ┌───────┐
        │   D   │        D has TWO copies of A without virtual inheritance
        └───────┘

Fix: class B : virtual public A {};
     class C : virtual public A {};
     class D : public B, public C {};   // now only ONE copy of A
```

---

## Quick Reference: C++ vs. C vs. Java

| Feature | C | C++ | Java |
|---------|---|-----|------|
| **Paradigm** | Procedural | Multi-paradigm | Object-oriented |
| **Memory** | Manual (`malloc`/`free`) | Manual + RAII + smart pointers | Garbage collected |
| **Polymorphism** | Function pointers | Virtual functions | Virtual by default |
| **Generics** | Macros | Templates (compile-time) | Generics (type erasure) |
| **Multiple Inheritance** | N/A | Supported | Interfaces only |
| **Exceptions** | `setjmp`/`longjmp` | `try`/`catch`/`throw` | `try`/`catch`/`throw` |
| **Strings** | `char*` / `char[]` | `std::string` | `String` (immutable) |

> For interviews: understand the tradeoffs between manual memory management (control, performance) and garbage collection (safety, simplicity). Know when each matters.
