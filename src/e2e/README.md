# E2E Tests

These are end-to-end integration tests that make real API calls to the Requesty service.

All e2e tests use a centralized setup (`src/e2e/setup.ts`) that validates environment variables and provides the `TEST_MODELS` configuration utility.

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
# Run all e2e tests (with default models)
npm run test:e2e

# Run e2e tests in watch mode
npm run test:e2e:watch

# Run pizza agent tests (model compatibility suite)
npm run test:pizza

# Run pizza tests in watch mode
npm run test:pizza:watch
```

### Using TEST_MODELS Environment Variable

All e2e test files support the `TEST_MODELS` environment variable to specify which models to test. Use a comma-separated list with format `model_id:display_name`:

```bash
# Run all e2e tests with a specific model
TEST_MODELS="mistral/mistral-medium-latest:Mistral Medium" npm run test:e2e

# Run all e2e tests with multiple models
TEST_MODELS="openai/gpt-4o-mini:GPT-4o Mini,anthropic/claude-3-5-sonnet-latest:Claude 3.5 Sonnet" npm run test:e2e

# Run pizza tests with custom models
TEST_MODELS="openai/gpt-4o,anthropic/claude-3-5-sonnet-latest" npm run test:pizza
```

If `TEST_MODELS` is not set, all tests use these default models (configured in `src/e2e/setup.ts`):
- `openai/gpt-4o-mini` (OpenAI GPT-4o Mini)
- `openai/gpt-4o` (OpenAI GPT-4o)
- `anthropic/claude-3-5-sonnet-latest` (Claude 3.5 Sonnet)

## Pizza Agent Tests

The pizza agent tests are designed to verify model compatibility across different AI providers. These tests use a realistic pizza ordering scenario with multiple tools to validate that models can handle complex agent workflows.

### Available Test Cases

The pizza tests include:

**agent.generate() tests:**
- Check ingredients in stock
- Calculate price for large pepperoni pizza
- Create order for medium pizza with toppings
- Check basil availability
- Recommend vegetarian pizza

**agent.stream() tests:**
- Stream inventory check and recommendations
- Stream price calculation and order creation
- Stream business analysis

Each test validates that the model can correctly use the provided tools and generate appropriate responses.

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

- **text-generation.test.ts** - Text generation tests (generateText, streamText, multi-turn conversations)
- **tools.test.ts** - Tool calling tests (function calling with generateText and streamText)
- **metadata.test.ts** - Provider-specific options and multi-modal messages
- **pizza.test.ts** - Pizza agent tests for comprehensive model compatibility testing

## Configuration

The `.env` file supports the following variables:

- `REQUESTY_API_KEY` (required) - Your Requesty API key
- `REQUESTY_BASE_URL` (optional) - Custom base URL for the Requesty API
- `TEST_MODELS` (optional) - Comma-separated list of models to test (format: `model_id:display_name`)

## Notes

- E2E tests are excluded from the regular `npm test` command
- E2E tests have a 30-second timeout (configurable in `vitest.e2e.config.ts`)
- These tests make real API calls and will consume API credits
- Tests will fail if no API key is provided
- The `.env` file is gitignored to prevent accidentally committing secrets
