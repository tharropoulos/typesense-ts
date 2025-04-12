# typesense-ts

An unofficial, fully type-safe Typesense client for Node.js written in TypeScript.


## Features

- **Fully Type-Safe**: Leverage TypeScript's type system for safer API interactions
- **Advanced Type Inference**: Collection schemas, search parameters, and responses are strongly typed
- **Built-in Type Validation**: Validate filter queries, sort expressions, and more at compile-time
- **Comprehensive API Coverage**:
  - Collections management
  - Document operations
  - Search and multi-search
  - Faceting and grouping
  - Aliases
  - Analytics rules and events
- **High-Performance**: Efficient request handling with automatic node failover
- **Modern**: Built with ESM and the latest TypeScript features

## Installation

I've not yet published this library to npm, but you can install it directly from the GitHub repository.
I'm planning to do so soon. The name is up for discussion, so if you have any suggestions, please let me know.

## Usage

### Configuring the Client

```typescript
import { configure } from 'typesense-ts';

const config = configure({
  apiKey: "xyz",
  nodes: [
    { url: "http://localhost:8108" },
    // Or specify host/port/protocol separately:
    { host: "example.com", port: 8108, protocol: "https", path: "/typesense" }
  ],
  // Optional parameters
  retryIntervalSeconds: 2,
  numRetries: 3,
  healthcheckIntervalSeconds: 30,
  additionalHeaders: { "Custom-Header": "value" }
});
```

### Defining Collections

```typescript
import { collection } from 'typesense-ts';

// Define a collection schema
const booksSchema = collection({
  name: 'books',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'authors', type: 'string[]' },
    { name: 'publication_year', type: 'int32', sort: true },
    { name: 'ratings_count', type: 'int32', facet: true },
    { name: 'average_rating', type: 'float', facet: true },
    { name: 'categories', type: 'string[]', facet: true }
  ],
  default_sorting_field: 'publication_year'
});

// Register your collection for type safety
declare module 'typesense-ts' {
  interface GlobalCollections {
    books: typeof booksSchema;
  }
}

// Create the collection
import { createCollection } from 'typesense-ts';
await createCollection(booksSchema, config);
```

### Searching Documents

```typescript
import { search } from 'typesense-ts';

// Type-safe search with autocomplete and validation
const searchResults = await search(
  'books',
  {
    q: 'harry potter',
    query_by: ['title', 'authors', 'categories'],
    sort_by: 'average_rating:desc',
    filter_by: 'publication_year:>=2000 && average_rating:>=4',
    facet_by: ['categories', 'average_rating'],
    group_by: ['categories'],
    page: 1,
    per_page: 10,
    highlight_fields: ['title', 'authors']
  },
  config
);

// Access strongly-typed results
searchResults.hits.forEach(hit => {
  console.log(hit.document.title);  // Typed as string
  console.log(hit.document.publication_year); // Typed as number
  console.log(hit.highlight.title); // Access highlighted snippets
});
```

### Multi-Search

```typescript
import { multisearch, multisearchEntry } from 'typesense-ts';

const { results } = await multisearch(
  {
    searches: [
      multisearchEntry({
        collection: 'books',
        q: 'harry',
        query_by: ['title', 'authors'],
        filter_by: 'average_rating:>=4',
      }),
      multisearchEntry({
        collection: 'books',
        q: 'potter',
        query_by: ['title', 'authors'],
        filter_by: 'average_rating:>=4.5',
      })
    ]
  },
  config
);

// Access the first result set
const firstResults = results[0];
```

### Working with Collections

```typescript
import { 
  retrieveCollection, 
  retrieveAllCollections,
  updateCollection,
  deleteCollection 
} from 'typesense-ts';
import { validateCollectionUpdate } from 'typesense-ts';

// Retrieve a collection
const collection = await retrieveCollection('books', config);

// Retrieve all collections
const collections = await retrieveAllCollections(config);

// Update a collection
const updateFields = validateCollectionUpdate(booksSchema, {
  fields: [
    { name: 'publisher', type: 'string' },
    // To drop a field:
    // { name: 'existing_field', drop: true }
  ]
});
await updateCollection(updateFields, config);

// Delete a collection
await deleteCollection('books', config);
```

### Working with Aliases

```typescript
import { alias, upsertAlias, retrieveAlias, deleteAlias } from 'typesense-ts';

// Define an alias
const booksAlias = alias({
  name: 'top_books',
  collection_name: 'books'
});

// Register for type safety
declare module 'typesense-ts' {
  interface GlobalAliases {
    topBooks: typeof booksAlias;
  }
}

// Create or update an alias
await upsertAlias(booksAlias, config);

// Retrieve an alias
const retrievedAlias = await retrieveAlias('top_books', config);

// Delete an alias
await deleteAlias('top_books', config);
```

### Analytics

```typescript
import { analyticsRule, createAnalyticsRule, createEvent } from 'typesense-ts';

// Define an analytics rule
const popularQueriesRule = analyticsRule({
  name: 'popular_searches',
  type: 'popular_queries',
  params: {
    source: {
      collections: ['books']
    },
    destination: {
      collection: 'popular_queries'
    }
  }
});

// Register for type safety
declare module 'typesense-ts' {
  interface GlobalAnalyticRules {
    popularQueries: typeof popularQueriesRule;
  }
}

// Create the rule
await createAnalyticsRule(popularQueriesRule, config);

// Create an analytics event
await createEvent(
  {
    name: 'click_event',
    type: 'click',
    data: {
      user_id: 'user123',
      doc_id: 'book456',
      q: 'harry potter'
    }
  },
  config
);
```

## Advanced Features

### Compile-Time Type Validation

The library performs validation at compile time for:

- Filter expressions
- Sort expressions
- Collection configuration
- Search parameters compatibility
- Required fields checking
- Type compatibility for all operations

This helps catch errors before runtime and provides excellent IDE autocomplete support.

### Automatic Node Failover

The client automatically handles node failover:

```typescript
const config = configure({
  apiKey: "xyz",
  nodes: [
    { url: "http://node1:8108" },
    { url: "http://node2:8108" },
    { url: "http://node3:8108" }
  ],
  // Optional nearest node for geo-distributed setups
  nearestNode: { url: "http://nearest:8108" }
});
```

- Automatically retries failed requests on different nodes
- Prioritizes healthy nodes and nearest node
- Performs periodic health checks

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for running tests)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/typesense-ts.git
cd typesense-ts

# Install dependencies
pnpm install

# Start Typesense using Docker
docker-compose up -d
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific tests
pnpm test -- path/to/test-file.test.ts
```

### Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

## Acknowledgements

- [Typesense](https://typesense.org/) - The search engine this client is built for
