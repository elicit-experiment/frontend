# Agent Guidelines for Elicit Frontend

This is a TypeScript-based frontend web application using Knockout.js MVVM framework, built with Webpack. It is the web interface for the Cockpit experiments.

## Build, Test, and Lint Commands

```bash
# Development server (runs on http://localhost:5504)
npm run serve

# Production build (outputs to /dist)
npm run build

# Run all tests in watch mode
npm run test

# Run a single test file (non-watch mode)
npx jest path/to/file.test.ts --no-watch

# Run a specific test by name
npx jest -t "test name pattern"

# Run tests with coverage
npx jest --coverage

# Lint and auto-fix TypeScript/JavaScript
npm run lint

# Clean build artifacts
npm run clean

# Serve static files from /dist
npm run serve_static
```

## Code Style Guidelines

### Formatting (Prettier)

- **Semi-colons**: Always use (`semi: true`)
- **Trailing commas**: Always (`trailingComma: "all"`)
- **Quotes**: Single quotes (`singleQuote: true`)
- **Line width**: 120 characters (`printWidth: 120`)
- **Indentation**: 2 spaces (`tabWidth: 2`)
- Use `npm run lint` to auto-format before committing

### TypeScript Conventions

**Imports**:

- Use path aliases defined in tsconfig.json:
  - `Components/*` → `source/application/Components/*`
  - `Managers/*` → `source/application/Managers/*`
  - `Utility/*` → `source/application/Utility/*`
  - `Models/*` → `source/application/Models/*`
  - `KnockoutBindings/*` → `source/application/KnockoutBindings/*`
  - `PortalClient` → `dependencies/PortalClient/PortalClient.min.js`
- Import order: external libs first, then path aliases, then relative imports

**Naming**:

- Classes: PascalCase (e.g., `FaceLandmarkerManager`, `DatapointAccumulator`)
- Interfaces: PascalCase with `I` prefix (e.g., `IQuestionViewModel`, `IQuestionEvent`)
- Type aliases: PascalCase with descriptive names (e.g., `CompressedNormalizedLandmark`)
- Methods/properties: camelCase (e.g., `compressDatapoint`, `uncompressDatapoint`)
- Private members: prefix with underscore `_` or use `private` keyword
- Unused parameters: prefix with `_` (e.g., `_unusedParam`)

**Types**:

- Target: ES2020
- Enable `strict` mode features where applicable
- Use explicit return types on public methods
- Use `any` sparingly; prefer `unknown` or proper types
- For JSON imports: Cast through `unknown` when needed

**Classes**:

- Use access modifiers: `public`, `protected`, `private`
- Abstract classes for base components (e.g., `QuestionsBase`, `DisposableComponent`)
- Export single class as `default` per file
- Use `ko.Computed<T>` for Knockout computed observables

### Knockout.js Patterns

- ViewModels use `knockout.observable()` and `knockout.computed()`
- Components register in `Main.ts` declarations array
- Use `applyBindings` with a declarations object
- Custom bindings go in `source/application/KnockoutBindings/`

### Error Handling

- Use `Promise` with `.then().catch()` chains for async operations
- Throw descriptive Error objects with status codes
- Check response.ok before processing fetch responses
- Log errors to console for debugging

### Testing (Jest)

- Use `describe()` and `test()` blocks
- Mock external dependencies with `jest.mock()`
- Use `beforeEach()`/`afterEach()` for setup/teardown
- Mock timers with `jest.useFakeTimers()` when testing time-dependent code
- Tests are excluded from TypeScript compilation (`**/*.spec.ts`)

### File Organization

- Components: `source/application/Components/<Category>/<Component>/<Component>.ts`
- Managers (services): `source/application/Managers/`
- Models: `source/application/Models/`
- Utilities: `source/application/Utility/`
- Tests: Co-located with source files as `<name>.test.ts`

## Key Libraries

- **UI Framework**: Knockout.js (MVVM)
- **Styling**: Bootstrap 5 + SCSS/Stylus
- **Build**: Webpack 5 + TypeScript
- **MediaPipe**: For face landmark detection
- **Highcharts**: Data visualization

## Important Notes

- The application uses RequireJS-style module loading configured in Webpack
- PortalClient is an external dependency located in `/dependencies`
- Configuration loaded from `source/configuration.json`
- Components must be registered in `Main.ts` to be available
