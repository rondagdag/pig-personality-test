# Draw the Pig Personality Test - AI Agent Instructions

## Project Overview
Next.js 15 (App Router) application that analyzes hand-drawn pig images using **Azure AI Content Understanding** (NOT OpenAI) and maps visual features to personality traits via a **deterministic rules engine** (no ML/randomness).

**Tech Stack**: Next.js 15 App Router • TypeScript • Azure AI Services • Azure Blob Storage • Terraform • Jest

## Critical Architecture Patterns

### Azure AI Integration (NOT OpenAI)
```typescript
// CRITICAL: Must use AIServices with custom subdomain, NOT generic CognitiveServices
// Endpoint: https://{custom-subdomain}.cognitiveservices.azure.com/
// Auth: Ocp-Apim-Subscription-Key header (NOT Bearer token)
// API Version: 2025-05-01-preview (hardcoded in lib/azure/content-understanding.ts)
// Analyzer: prebuilt-imageAnalyzer

// Request/Response Pattern (lib/azure/content-understanding.ts):
1. submitAnalysisRequest() → returns requestId
2. pollForResults() → poll every 1s, max 60s timeout
3. transformToDetection() → convert Azure response to typed Detection model
```

### Data Flow Pipeline
```
User Upload (base64/blobUrl)
  ↓
app/api/analyze/route.ts (POST handler, runtime='nodejs', maxDuration=60)
  ↓
Azure Blob Storage (pig-images: public 24h, pig-results: private)
  ↓
lib/azure/content-understanding.ts (async polling pattern)
  ↓
Detection type (typed bounding boxes: head, body, legs, ears, tail)
  ↓
lib/scoring/pigRules.ts (deterministic rules, NO randomness)
  ↓
lib/storage/results.ts (persist JSON to private blob)
```

### Type System (`lib/types.ts`)
```typescript
// Core detection model (internal, NOT Azure's format)
Detection: {
  overall: { boundingBox, canvas }
  head?: DetectionRegion
  body?: DetectionRegion
  legs?: DetectionRegion[]
  ears?: DetectionRegion[]
  tail?: DetectionRegion
}

// All bounding boxes: { x, y, width, height } (top-left origin)
// Azure response → transformToDetection() → Detection type

PersonalityTrait: {
  category: 'placement' | 'orientation' | 'details' | 'legs' | 'ears' | 'tail'
  statement: string  // from lib/prompts.ts PERSONALITY_STATEMENTS
  evidence: { key: string, value: string | number }
}
```

## Key Conventions

### Next.js 15 App Router Specifics
- **Server Components by default**: Only add `'use client'` for hooks, state, or browser APIs
- Client components: `draw/page.tsx`, `upload/page.tsx`, `group/page.tsx`, `admin/page.tsx`
- **API Route Config**: Always set `export const runtime = 'nodejs'` and `export const maxDuration = 60` for Azure SDK
- **Image Optimization**: Remote patterns configured for `**.blob.core.windows.net` in `next.config.ts`
- **Body Size Limit**: 10MB for server actions (supports base64 images)

### Storage Access Patterns
```typescript
// WRONG: Azure SDK rejects "private" string
containerClient.createIfNotExists({ access: 'private' })

// CORRECT: Omit access parameter for private (defaults to private)
containerClient.createIfNotExists()

// Public access uses "blob" or "container"
containerClient.createIfNotExists({ access: 'blob' })
```

### Rules Engine (lib/scoring/pigRules.ts)
- **Deterministic**: No randomness, same input = same output
- **Thresholds**: Placement (0.33/0.67), Details (>5 = many), Ear (0.3), Tail (0.4)
- **Fallbacks**: Returns default traits when features missing (e.g., orientation defaults to "Front")
- **Testing**: Use `createMockDetection()` for unit tests with override pattern
- **Evidence Format**: `{ key: "placement=Top", value: 0.25 }` for traceability
- **Centralized Prompts**: All personality statements and discussion prompts in `lib/prompts.ts`

### Environment Variables
```bash
# REQUIRED for Azure AI (AIServices resource with custom domain)
CONTENT_UNDERSTANDING_ENDPOINT=https://{custom-domain}.cognitiveservices.azure.com/
CONTENT_UNDERSTANDING_KEY=<api-key>

# REQUIRED for storage
AZURE_STORAGE_ACCOUNT_NAME=<name>
AZURE_STORAGE_ACCOUNT_KEY=<key>
AZURE_STORAGE_CONTAINER_NAME=pig-images
```

## Development Workflows

### Local Development
```bash
npm install              # Never use pnpm (package-lock.json committed)
npm run dev             # Port 3000
npm test                # Jest with React Testing Library
npm test -- --watch     # Watch mode for TDD
npm run lint            # ESLint
```

### Testing Strategy
- **Unit tests**: Rules engine only (`tests/pigRules.test.ts`)
- **No integration tests**: Azure calls mocked
- **Pattern**: `createMockDetection()` with partial overrides
- Coverage: Placement, details, legs, ears, tail, summary generation
- **Test config**: `jest.config.js` with jsdom environment for React components

### Infrastructure Deployment (Terraform)
```bash
cd iac
terraform init           # One-time setup (upgraded to azurerm ~> 4.0)
terraform plan -out=main.tfplan
terraform apply main.tfplan
```

**Critical Changes in v4.0**:
- Explicit `subscription_id` required in provider block
- `kind = "AIServices"` with `custom_subdomain_name` for Content Understanding
- Storage container `storage_account_name` deprecated (use `storage_account_id`)

**Post-Terraform**: Manually retrieve secrets from Key Vault for `.env.local`:
```bash
az keyvault secret show --vault-name <kv-name> --name content-understanding-key --query value -o tsv
az keyvault secret show --vault-name <kv-name> --name storage-account-key --query value -o tsv
```

### Production Deployment
**GitHub Actions** (`.github/workflows/azure-deploy.yml`):
- Triggers on push to `main` or manual dispatch
- OIDC auth (no secrets in code)
- Requires secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_WEBAPP_NAME`
- Runs `npm ci`, `npm test`, `npm run build` before deploy
- Uses `azure/webapps-deploy@v3` for deployment

## Common Pitfalls

1. **Wrong Azure Resource Type**: Content Understanding requires AIServices with custom domain, not generic westus.api.cognitive.microsoft.com endpoint
2. **Storage Access**: Don't use `"private"` string - omit parameter entirely
3. **Async Polling**: Don't forget polling loop in `pollForResults()` - Azure analysis is async with 1s intervals
4. **Request ID Extraction**: Check multiple headers: `request-id`, `apim-request-id`, `Operation-Location`
5. **Camera on Mobile**: Use `facingMode: 'environment'` for rear camera in group mode
6. **Next.js 15 App Router**: Server Components by default - add `"use client"` for hooks/state
7. **Terraform Provider v4**: Must specify `subscription_id` in provider block (breaking change from v3)

## File Organization
```
app/
├── api/analyze/route.ts          # Main API endpoint (Node.js runtime, 60s timeout)
├── draw/page.tsx                  # Timer page (client component)
├── upload/page.tsx                # Image upload with camera
├── group/page.tsx                 # Group mode with camera capture
├── results/[id]/page.tsx          # Individual results
lib/
├── azure/content-understanding.ts # Azure REST client with polling
├── scoring/pigRules.ts            # Deterministic rules engine
├── storage/blob.ts                # Image upload helpers (SAS tokens)
├── storage/results.ts             # Result persistence
├── types.ts                       # TypeScript definitions
├── prompts.ts                     # Centralized personality statements & discussion prompts
iac/
├── main.tf                        # Azure resources (azurerm ~> 4.0)
├── variables.tf                   # Input variables
├── outputs.tf                     # Deployment outputs
```

## Mobile Responsiveness
- Buttons stack on mobile: `flex-col sm:flex-row`
- Touch targets: `py-2.5 sm:py-3 active:bg-pink-800 touch-manipulation`
- Responsive text: `text-4xl sm:text-5xl md:text-6xl`
- Camera API: `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- No custom CSS: All styling via Tailwind utilities

## When Making Changes

### Adding New Personality Rules
1. Add threshold constant at top of `lib/scoring/pigRules.ts`
2. Create evaluation function (e.g., `evaluateFeatureName()`)
3. Add personality statement to `lib/prompts.ts` in `PERSONALITY_STATEMENTS`
4. Call evaluation function from `analyzePigDrawing()`
5. Add trait category to `PersonalityTrait['category']` type in `lib/types.ts`
6. Write unit tests in `tests/pigRules.test.ts` using `createMockDetection()`

### Modifying Azure Integration
1. Check Microsoft Learn docs: https://learn.microsoft.com/azure/ai-services/content-understanding/
2. Update API version in `lib/azure/content-understanding.ts`
3. Verify endpoint format matches custom domain pattern
4. Test connection with `testConnection()` helper function
5. Remember: Submit returns request-id, poll with analyzerResults endpoint

### Infrastructure (Terraform in `iac/`)
**Critical**: Uses azurerm ~> 4.0 (breaking changes from v3)

```bash
cd iac
terraform init           # One-time setup
terraform plan -out=main.tfplan
terraform apply main.tfplan

# Post-deploy: Retrieve secrets from Key Vault
az keyvault secret show --vault-name <kv-name> --name content-understanding-key --query value -o tsv
```

**v4.0 Breaking Changes**:
- Explicit `subscription_id` required in provider block
- `kind = "AIServices"` with `custom_subdomain_name` for Content Understanding
- Storage container `storage_account_name` deprecated (use `storage_account_id`)

**Resources Deployed**:
- Storage Account: pig-images (public 24h), pig-results (private)
- AI Services: kind=AIServices with custom subdomain (NOT CognitiveServices)
- Key Vault: All secrets stored here, App Service accesses via managed identity
- App Service: Linux B1, Node.js 20 LTS

### Modifying Infrastructure
1. Run `terraform plan` first to review changes
2. After applying, restart App Service: `az webapp restart --resource-group <rg> --name <app-name>`
3. Update DEPLOYMENT.md with new resource names/URLs

### UI Changes
- Use existing Tailwind utilities (no custom CSS unless in `app/globals.css`)
- Test mobile breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Dark mode: Always add `dark:` variants for colors/backgrounds
- Images: Use Next.js `<Image>` component with Azure Blob remote patterns
