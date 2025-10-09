# E2E Tests

These are end-to-end integration tests that make real API calls to the Requesty service.

## Setup

1. Copy the `.env.example` file to `.env` in the `src/e2e` directory:
   ```bash
   cp src/e2e/.env.example src/e2e/.env
   ```

2. Edit the `.env` file and add your configuration:
   ```bash
   # Required: Your Requesty API key
   REQUESTY_API_KEY=your-api-key-here

   # Optional: Base URL for Requesty API (defaults to https://router.requesty.ai/v1)
   REQUESTY_BASE_URL=https://router.requesty.ai/v1
   ```

## Running E2E Tests

Once you've configured the `.env` file:

```bash
# Run all e2e tests
npm run test:e2e

# Run e2e tests in watch mode
npm run test:e2e:watch
```

### Alternative: Environment Variables

You can also set environment variables directly without a `.env` file:

```bash
# Export the environment variable
export REQUESTY_API_KEY='your-api-key-here'
npm run test:e2e

# Or inline
REQUESTY_API_KEY='your-api-key-here' npm run test:e2e
```

## Test Files

- **test-requesty.test.ts** - Basic functionality tests including chat and reasoning
- **test-real-integration.test.ts** - Comprehensive integration tests covering streaming, tools, multi-modal, etc.
- **test-published-package.test.ts** - Tests for the published npm package (requires the package to be installed)

## Configuration

The `.env` file supports the following variables:

- `REQUESTY_API_KEY` (required) - Your Requesty API key
- `REQUESTY_BASE_URL` (optional) - Custom base URL for the Requesty API

## Notes

- E2E tests are excluded from the regular `npm test` command
- E2E tests have a 30-second timeout (configurable in `vitest.e2e.config.ts`)
- These tests make real API calls and will consume API credits
- Tests will fail if no API key is provided
- The `.env` file is gitignored to prevent accidentally committing secrets
