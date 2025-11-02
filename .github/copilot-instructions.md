# Draw the Pig Personality Test - AI Agent Instructions

## Project Overview
Next.js 15 (App Router) application that analyzes hand-drawn pig images using Azure AI Content Understanding and maps visual features to personality traits via a deterministic rules engine.

## Critical Architecture Patterns

### Azure AI Integration (NOT OpenAI)
- **Service Type Required**: AIServices (kind: AIServices) with custom domain, NOT generic CognitiveServices
- **Endpoint Pattern**: `https://{custom-domain}.cognitiveservices.azure.com/contentunderstanding/analyzers/{analyzerId}:analyze`
- **API Version**: `2025-05-01-preview` (hardcoded in `lib/azure/content-understanding.ts`)
- **Analyzer ID**: `prebuilt-imageAnalyzer` for object detection
- **Authentication**: Uses `Ocp-Apim-Subscription-Key` header (not Bearer token)
- **Request/Response Flow**: Submit → Poll (1s intervals, 60s timeout) → Transform (see `analyzeImage()` in `lib/azure/content-understanding.ts`)

### Data Flow Pipeline
1. **Image Upload** → `app/api/analyze/route.ts` (POST with base64 or blobUrl)
2. **Azure Blob Storage** → Public container for 24h (pig-images), private for results (pig-results)
3. **Azure AI Analysis** → `lib/azure/content-understanding.ts` (async polling pattern)
4. **Detection Transform** → Azure response → `Detection` type (typed bounding boxes)
5. **Rules Engine** → `lib/scoring/pigRules.ts` (deterministic, no ML)
6. **Result Persistence** → JSON in private blob container (`lib/storage/results.ts`)

### Type System (lib/types.ts)
- `Detection`: Internal model with head/body/legs/ears/tail bounding boxes + overall canvas
- `AzureAnalyzerResponse`: Raw Azure API response (status polling with Running/Succeeded/Failed)
- `PersonalityTrait`: Rule output with category/statement/evidence
- All bounding boxes use `{ x, y, width, height }` coordinate system (top-left origin)

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

### Working with Infrastructure as Code (IaC)

#### Terraform Structure
All infrastructure code lives in `iac/` directory:
- **main.tf**: Core resources (RG, Storage, Key Vault, AI Services, App Service)
- **variables.tf**: Input variables with validation rules
- **outputs.tf**: Exported values for app configuration
- **terraform.tfstate**: State file (committed to repo, consider remote backend for production)

#### Resource Architecture
```
Resource Group (rg-draw-the-pig)
├── Storage Account (pigtest{suffix})
│   ├── Container: pig-images (public blob access)
│   └── Container: pig-results (private)
├── Key Vault (pigtest-kv-{suffix})
│   ├── Secret: storage-account-key
│   ├── Secret: content-understanding-key
│   └── Secret: content-understanding-endpoint
├── Cognitive Account (pigtest-ai-{suffix})
│   ├── kind: AIServices (NOT CognitiveServices)
│   └── custom_subdomain_name: Required for Content Understanding
├── Service Plan (pigtest-plan-{suffix})
│   └── SKU: B1 (Basic Linux)
└── Linux Web App (pigtest-app-{suffix})
    ├── Node.js 20 LTS runtime
    ├── System-assigned managed identity
    └── Key Vault references in app settings
```

#### Variables Reference
- **project_name**: Resource prefix (3-10 chars, lowercase alphanumeric, default: `pigtest`)
- **resource_group_name**: RG name (default: `rg-draw-the-pig`)
- **location**: Azure region (must be `westus`, `swedencentral`, or `australiaeast` for Content Understanding)
- **app_service_sku**: App Service tier (B1/B2/S1/S2/P1V2/P2V2, default: `B1`)
- **tags**: Resource tags (Project, Environment, ManagedBy)

#### Common IaC Operations

**Initial Setup**:
```bash
cd iac
terraform init  # Downloads azurerm ~> 4.0 and random ~> 3.0 providers
```

**Plan Changes** (always run first):
```bash
terraform plan -out=main.tfplan  # Saves plan to file
terraform show main.tfplan       # Review saved plan
```

**Apply Infrastructure**:
```bash
terraform apply main.tfplan      # Apply saved plan
terraform apply -auto-approve    # Apply without confirmation (CI/CD only)
```

**Override Variables**:
```bash
terraform plan -var="location=swedencentral" -var="app_service_sku=B2"
terraform plan -var-file="prod.tfvars"  # Use variable file
```

**View Outputs**:
```bash
terraform output                              # All outputs
terraform output -json                        # JSON format
terraform output app_service_url              # Specific output
terraform output -raw ai_foundry_key          # Sensitive values
```

**Retrieve Secrets for Local Development**:
```bash
# Get Key Vault name from Terraform output
KV_NAME=$(terraform output -raw key_vault_name)

# Retrieve secrets
az keyvault secret show --vault-name $KV_NAME --name content-understanding-key --query value -o tsv
az keyvault secret show --vault-name $KV_NAME --name storage-account-key --query value -o tsv

# Or use Terraform output (requires terraform refresh)
terraform output -raw ai_foundry_key
terraform output -raw storage_account_connection_string
```

**Destroy Resources** (careful!):
```bash
terraform plan -destroy -out=destroy.tfplan  # Review destruction plan
terraform apply destroy.tfplan               # Execute destruction
terraform destroy -auto-approve              # Skip confirmation (use with caution)
```

#### Critical Terraform Provider v4.0 Changes
The project uses azurerm ~> 4.0, which introduced breaking changes from v3:

1. **Subscription ID Required**: Must explicitly set `subscription_id` in provider block
   ```hcl
   provider "azurerm" {
     subscription_id = "00000000-0000-0000-0000-000000000000"
   }
   ```

2. **Storage Container Changes**: `storage_account_name` deprecated, use `storage_account_id`
   ```hcl
   # OLD (v3): storage_account_name = azurerm_storage_account.main.name
   # NEW (v4): Use storage_account_name directly (still supported but id preferred)
   ```

3. **Key Vault Soft Delete**: Feature flags now nested under `features.key_vault`
   ```hcl
   features {
     key_vault {
       purge_soft_delete_on_destroy = true
     }
   }
   ```

#### Adding New Resources

**Example: Add Application Insights**:
```hcl
resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-ai-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  
  tags = var.tags
}

# Add to Key Vault
resource "azurerm_key_vault_secret" "appinsights_key" {
  name         = "appinsights-instrumentation-key"
  value        = azurerm_application_insights.main.instrumentation_key
  key_vault_id = azurerm_key_vault.main.id
}

# Add to App Service app_settings
app_settings = {
  APPINSIGHTS_INSTRUMENTATIONKEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.appinsights_key.id})"
}
```

#### Post-Deployment Steps

1. **Restart App Service** to load Key Vault references:
   ```bash
   RG_NAME=$(terraform output -raw resource_group_name)
   APP_NAME=$(terraform output -raw app_service_name)
   az webapp restart --resource-group $RG_NAME --name $APP_NAME
   ```

2. **Update Local Environment**:
   ```bash
   # Copy .env.local.example to .env.local
   # Populate with Terraform outputs
   echo "AZURE_STORAGE_ACCOUNT_NAME=$(terraform output -raw storage_account_name)" >> .env.local
   echo "AZURE_STORAGE_ACCOUNT_KEY=$(terraform output -raw ai_foundry_key)" >> .env.local
   ```

3. **Verify Deployment**:
   ```bash
   # Test App Service endpoint
   curl https://$(terraform output -raw app_service_default_hostname)
   
   # Check app settings loaded correctly
   az webapp config appsettings list --resource-group $RG_NAME --name $APP_NAME
   ```

4. **Update Documentation**: Update DEPLOYMENT.md with new resource names/URLs

#### State Management Best Practices

**Current Setup**: State stored locally in `iac/terraform.tfstate` (committed to repo)

**Recommended for Production**: Use remote backend
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "tfstate123456"
    container_name       = "tfstate"
    key                  = "pig-personality-test.tfstate"
  }
}
```

**State Commands**:
```bash
terraform state list                       # List all resources
terraform state show <resource>            # Show resource details
terraform state rm <resource>              # Remove from state (doesn't destroy)
terraform import <resource> <azure-id>     # Import existing resource
terraform refresh                          # Sync state with remote
```

#### Troubleshooting IaC Issues

**Problem: Terraform fails with "subscription not found"**
- Solution: Update `subscription_id` in provider block (v4.0 requirement)

**Problem: Key Vault access denied**
- Solution: Verify access policy for your user/service principal:
  ```bash
  az keyvault set-policy --name <kv-name> --upn <user@domain.com> --secret-permissions get list
  ```

**Problem: App Service can't access Key Vault secrets**
- Solution: Ensure managed identity has access policy (applied via `azurerm_key_vault_access_policy`)

**Problem: Storage container already exists error**
- Solution: Import existing container:
  ```bash
  terraform import azurerm_storage_container.images /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/{sa}/blobServices/default/containers/pig-images
  ```

**Problem: AI Services endpoint returns 404**
- Solution: Verify `kind = "AIServices"` and `custom_subdomain_name` is set (generic CognitiveServices won't work)

**Problem: Terraform state drift**
- Solution: Run `terraform plan` to see differences, then `terraform apply` to reconcile

#### Security Considerations

- **Secrets Management**: All secrets stored in Key Vault, referenced via `@Microsoft.KeyVault(...)` syntax
- **Managed Identity**: App Service uses system-assigned identity to access Key Vault (no keys in app settings)
- **Storage Access**: Public blob access only for `pig-images` container (24h retention), `pig-results` is private
- **TLS Enforcement**: `min_tls_version = "TLS1_2"` and `https_traffic_only_enabled = true`
- **Soft Delete**: Key Vault has 7-day retention for accidental deletions
- **Subscription ID**: Hardcoded in main.tf (consider moving to variable for multi-tenant)

### Updating Infrastructure
1. Always run `terraform plan` first to review changes
2. After applying, restart App Service to pick up new Key Vault secrets:
   ```bash
   az webapp restart --resource-group <rg> --name <app-name>
   ```
3. Update DEPLOYMENT.md with new resource names/URLs
4. Test locally with updated `.env.local` before deploying

### UI Changes
- Use existing Tailwind utilities (no custom CSS unless in `app/globals.css`)
- Test mobile breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Dark mode: Always add `dark:` variants for colors/backgrounds
- Images: Use Next.js `<Image>` component with Azure Blob remote patterns
