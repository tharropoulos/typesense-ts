<div align="center">
  <h1>typesense-ts 🔍</h1>
</div>

<div align="center" style="font-size:1.5rem; font-weight:600; margin-bottom: 1rem;">
  A fully type-safe, <strong>unofficial</strong> Typesense client for Node.js written in TypeScript that provides compile-time validation on almost every parameter.
</div>

<div align="center">
  <video width="80%" controls>
    <source src="showcase.mp4" type="video/mp4">
    Your browser does not support the video tag.
  </video>
</div>

&nbsp;
**Note**: Although I maintain both this library and the [main](https://github.com/typesense/typesense-js) client, this library is unofficial and a passion project. For official support, please refer to the [Typesense documentation](https://typesense.org/docs/).

## Features

- **🔒 Fully Type-Safe**: Leverage TypeScript's type system for safer API interactions with compile-time validation
- **🧠 Advanced Type Inference**: Collection schemas, search parameters, and responses are strongly typed
- **✅ Built-in Validation**: Validate filter queries, sort expressions, and field configurations at compile-time
- **🎯 Roadmap**:
  - ~~Collections management (create, update, delete, retrieve)~~ ✅ **Done!**
  - ~~Document operations (CRUD, bulk import)~~ ✅ **Done!**
  - ~~Search and multi-search with full parameter validation~~ ✅ **Done!**
  - ~~Faceting, grouping~~ ✅ **Done!**
  - ~~Aliases~~ ✅ **Done!**
  - ~~Curation & Overrides~~ ✅ **Done!**
  - ~~Stopwords~~ ✅ **Done!**
  - ~~Analytics~~ ✅ **Done!**
  - Document exporting
  - Conversational Search
  - Api Key Management
  - Synonyms
- **⚡ Hassle-Free**: Efficient request handling with automatic node failover and health checking

## Installation

```bash
# Using npm
npm install typesense-ts@latest

# Using pnpm
pnpm add typesense-ts@latest

# Using yarn
yarn add typesense-ts@latest
```

## Quick Start

### 1. Configure the Client

```typescript
import { configure, setDefaultConfiguration } from "typesense-ts";

// Configure and set as default
setDefaultConfiguration({
  apiKey: "xyz",
  nodes: [
    { url: "http://localhost:8108" },
    // Or specify host/port/protocol separately:
    { host: "example.com", port: 8108, protocol: "https", path: "/typesense" },
  ],
  // Optional parameters
  retryIntervalSeconds: 2,
  numRetries: 3,
  healthcheckIntervalSeconds: 30,
  additionalHeaders: { "Custom-Header": "value" },
});
```

### 2. Define a Collection Schema

```typescript
import { collection } from "typesense-ts";

// Define a type-safe collection schema
const booksSchema = collection({
  name: "books",
  fields: [
    { name: "title", type: "string" },
    { name: "authors", type: "string[]" },
    { name: "publication_year", type: "int32", sort: true },
    { name: "ratings_count", type: "int32", facet: true },
    { name: "average_rating", type: "float", facet: true },
    { name: "categories", type: "string[]", facet: true },
  ],
  default_sorting_field: "publication_year",
});

// Register the collection globally for type safety
declare module "typesense-ts" {
  interface Collections {
    books: typeof booksSchema.schema;
  }
}
```

### 3. Create the Collection

```typescript
// Create the collection in Typesense
await booksSchema.create();
```

### 4. Perform Type-Safe Search

```typescript
// Type-safe search with full autocomplete and validation
const searchResults = await booksSchema.search({
  q: "harry potter",
  query_by: ["title", "authors", "categories"], // ✅ Fully typed field names
  sort_by: "average_rating:desc", // ✅ Compile-time sort validation
  filter_by: "publication_year:>=2000 && average_rating:>=4", // ✅ Filter validation
  facet_by: ["categories", "average_rating"], // ✅ Only facetable fields allowed
  group_by: ["categories"], // ✅ Only facetable fields allowed
  page: 1,
  per_page: 10,
  highlight_fields: ["title", "authors"], // ✅ Only searchable fields allowed
});

// Access strongly-typed results
searchResults.hits.forEach((hit) => {
  console.log(hit.document.title); // ✅ Typed as string
  console.log(hit.document.publication_year); // ✅ Typed as number
  console.log(hit.highlight.title); // ✅ Access highlighted snippets
});
```

## Advanced Usage

### Multi-Search Operations

```typescript
import { multisearch, multisearchEntry } from "typesense-ts";

const { results } = await multisearch({
  searches: [
    multisearchEntry({
      collection: "books",
      q: "harry",
      query_by: ["title", "authors"],
      filter_by: "average_rating:>=4",
    }),
    multisearchEntry({
      collection: "books",
      q: "potter",
      query_by: ["title", "authors"],
      filter_by: "average_rating:>=4.5",
    }),
  ],
});

// Each result is fully typed based on its collection schema
const firstResults = results[0]; // ✅ Type-safe access
```

### Document Operations

```typescript
// Create documents with type safety
await booksSchema.documents.create({
  title: "The TypeScript Handbook",
  authors: ["Microsoft Team"],
  publication_year: 2023,
  ratings_count: 1250,
  average_rating: 4.8,
  categories: ["Programming", "Web Development"],
});

// Bulk import with error handling
try {
  const results = await booksSchema.documents.import(
    [
      {
        title: "Book 1",
        authors: ["Author 1"],
        publication_year: 2023,
        ratings_count: 100,
        average_rating: 4.5,
        categories: ["Fiction"],
      },
      {
        title: "Book 2",
        authors: ["Author 2"],
        publication_year: 2024,
        ratings_count: 200,
        average_rating: 4.2,
        categories: ["Non-Fiction"],
      },
    ],
    { return_doc: true },
  );

  console.log(`Imported ${results.length} documents`);
} catch (error) {
  if (error.name === "DocumentImportError") {
    console.log(`Failed documents:`, error.failedDocuments);
  }
}
```

### Collection Management

```typescript
// Update collection schema
import { validateCollectionUpdate } from "typesense-ts";

const updateFields = validateCollectionUpdate(booksSchema.schema, {
  fields: [
    { name: "publisher", type: "string" },
    // To drop a field:
    { name: "old_field", drop: true },
  ],
});
await booksSchema.update(updateFields);

// Retrieve collection info
const collectionInfo = await booksSchema.retrieve();
console.log(`Collection has ${collectionInfo.num_documents} documents`);
```

### Aliases and Overrides

```typescript
import { alias, override } from "typesense-ts";

// Create an alias
const booksAlias = alias({
  name: "popular_books",
  collection_name: "books",
});
await booksAlias.upsert();

// Create search overrides
const topBooksOverride = override("featured_books", {
  collection: "books",
  rule: { query: "bestseller", match: "exact" },
  includes: [{ id: "book_123", position: 1 }],
  remove_matched_tokens: false,
});
await topBooksOverride.upsert();
```

### Analytics and Stopwords

```typescript
import { analyticsRule, stopword } from "typesense-ts";

// Create analytics rules
const popularQueriesRule = analyticsRule({
  name: "popular_searches",
  type: "popular_queries",
  params: {
    source: { collections: ["books"] },
    destination: { collection: "analytics" },
  },
});
await popularQueriesRule.upsert();

// Manage stopwords
const commonStopwords = stopword("english_stopwords", {
  stopwords: ["the", "and", "or", "but"],
  locale: "en",
});
await commonStopwords.upsert();
```

## Configuration Options

### Node Configuration

```typescript
const config = configure({
  apiKey: "your-api-key",
  nodes: [
    { url: "http://node1:8108" },
    { host: "node2.example.com", port: 8108, protocol: "https" },
  ],
  nearestNode: { url: "http://nearest:8108" }, // Optional for geo-distributed setups
  numRetries: 5, // Number of retries (default: nodes.length + 1)
  retryIntervalSeconds: 2, // Delay between retries (default: 1)
  healthcheckIntervalSeconds: 60, // Health check interval (default: 60)
  connectionTimeoutSeconds: 10, // Connection timeout (default: system)
  timeoutSeconds: 30, // Request timeout (default: system)
  additionalHeaders: {
    // Custom headers
    Authorization: "Bearer token",
  },
});
```

### Advanced Schema Features

```typescript
// Embedding fields for vector search
const articlesSchema = collection({
  name: "articles",
  fields: [
    { name: "title", type: "string" },
    { name: "content", type: "string" },
    {
      name: "title_embedding",
      type: "float[]",
      embed: {
        from: ["title"],
        model_config: { model_name: "ts/e5-small" },
      },
    },
  ],
});

// Nested objects
const usersSchema = collection({
  name: "users",
  fields: [
    { name: "name", type: "string" },
    { name: "profile", type: "object" },
    { name: "profile.age", type: "int32" },
    { name: "profile.location", type: "geopoint" },
  ],
  enable_nested_fields: true,
});

// Reference fields for JOINs
const ordersSchema = collection({
  name: "orders",
  fields: [
    { name: "order_id", type: "string" },
    { name: "user_id", type: "string", reference: "users.id" },
    { name: "total", type: "float" },
  ],
});
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker (for running tests with Typesense instance)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/typesense-ts.git
cd typesense-ts

# Install dependencies
pnpm install

# Start Typesense for development
docker-compose up -d
```

### Available Scripts

```bash
# Build the library
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format

# Development mode with watch
pnpm dev
```

### Testing

The test suite includes integration tests that run against a real Typesense instance:

```bash
# Run all tests (starts Typesense automatically)
pnpm test

# Run specific test file
pnpm test tests/search.test.ts

# Run tests in CI mode (skips Docker setup)
CI=true pnpm test
```

### Project Structure

```
src/
├── collection/          # Collection schema and operations
├── document/           # Document CRUD operations
├── analytics/          # Analytics rules and events
├── lexer/             # Type-level parsers for filters, sorts, etc.
├── http/              # HTTP client and request handling
├── config/            # Configuration management
└── index.ts          # Main exports

tests/                 # Test suite
docker-compose.yml    # Typesense development instance
tsup.config.ts       # Build configuration
```

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Write tests** for new functionality
3. **Follow TypeScript best practices** and maintain type safety
4. **Run the full test suite** before submitting
5. **Update documentation** for new features

### Development Workflow

```bash
# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and add tests
# ...

# Run tests and type checking
pnpm test
pnpm type-check
pnpm lint

# Commit your changes
git commit -m "Add amazing feature"

# Push and create a pull request
git push origin feature/amazing-feature
```

### Code Style

- Enforce type-level programming for validation
- Write tests for new features
- Follow the existing code organization patterns

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- **[Typesense](https://typesense.org/)** - The amazing search engine this client is built for
- **TypeScript Team** - For the powerful type system that makes this library possible
- **Contributors** - Thank you to everyone who helps improve this library
