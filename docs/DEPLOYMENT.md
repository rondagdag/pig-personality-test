# Azure Deployment Summary

**Deployment Date:** October 22, 2025
**Status:** ✅ Successfully Deployed

## 📦 Deployed Resources

| Resource Type | Resource Name | Location |
|--------------|---------------|----------|
| Resource Group | `<your-resource-group>` | West US |
| Storage Account | `<your-project-name><suffix>` | West US |
| AI Services | `<your-project-name>-aiservices-<suffix>` (AIServices with custom subdomain) | West US |
| AI Foundry Hub | `<your-project-name>-hub-<suffix>` | West US |
| AI Foundry Project | `<your-project-name>-project-<suffix>` | West US |
| Key Vault | `<your-project-name>-kv-<suffix>` | West US |
| App Service Plan | `<your-project-name>-plan-<suffix>` | West US (Linux B1) |
| Web App | `<your-project-name>-app-<suffix>` | West US |

## 🔗 Important URLs

- **App Service URL:** https://`<your-app-name>`.azurewebsites.net
- **Storage Account:** `<your-storage-account>`.blob.core.windows.net
- **Key Vault:** https://`<your-keyvault-name>`.vault.azure.net/
- **AI Services Endpoint:** https://`<your-ai-services-name>`.cognitiveservices.azure.com/
- **AI Foundry Portal:** https://ai.azure.com/
  - Hub: `<your-hub-name>`
  - Project: `<your-project-name>`

## 🔐 Credentials (Stored in Key Vault)

All sensitive credentials are securely stored in Azure Key Vault:

- `content-understanding-key` - AI Service API key
- `content-understanding-endpoint` - AI Service endpoint URL
- `storage-account-key` - Storage account access key

### Retrieve Secrets from Key Vault

```bash
# Get Content Understanding key
az keyvault secret show --vault-name <your-keyvault-name> \
  --name content-understanding-key --query value -o tsv

# Get Storage account key
az keyvault secret show --vault-name <your-keyvault-name> \
  --name storage-account-key --query value -o tsv
```

## 🚀 Local Development Setup

The `.env.local` file has been created with all necessary credentials:

```env
AZURE_STORAGE_ACCOUNT_NAME=<your-storage-account-name>
AZURE_STORAGE_ACCOUNT_KEY=<from-key-vault>
AZURE_STORAGE_CONTAINER_NAME=pig-images
CONTENT_UNDERSTANDING_ENDPOINT=https://<your-ai-services-name>.cognitiveservices.azure.com/
CONTENT_UNDERSTANDING_KEY=<from-key-vault>
AI_FOUNDRY_HUB_NAME=<your-hub-name>
AI_FOUNDRY_HUB_ID=<from-terraform-output>
AI_FOUNDRY_PROJECT_NAME=<your-project-name>
AI_FOUNDRY_PROJECT_ID=<from-terraform-output>
```

### Run Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access at http://localhost:3000
```

## 📤 Deploy Application to Azure

### Option 1: Manual ZIP Deployment

```bash
# Build the Next.js application
npm run build

# Create deployment package
zip -r deploy.zip .next public package.json package-lock.json next.config.ts

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group <your-resource-group> \
  --name <your-app-name> \
  --src deploy.zip
```

### Option 2: GitHub Actions (Automated)

The workflow is configured in `.github/workflows/azure-deploy.yml` using OIDC authentication.

#### Required GitHub Secrets

Configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

```bash
AZURE_CLIENT_ID=<your-service-principal-client-id>
AZURE_TENANT_ID=<your-azure-tenant-id>
AZURE_SUBSCRIPTION_ID=<your-azure-subscription-id>
AZURE_WEBAPP_NAME=<your-app-service-name>
```

#### Set Up Service Principal with OIDC

1. **Create a service principal with federated credentials:**

```bash
# Create Azure AD application
az ad app create --display-name "pig-personality-test-github"

# Get the app ID
APP_ID=$(az ad app list --display-name "pig-personality-test-github" --query "[0].appId" -o tsv)

# Create service principal
az ad sp create --id $APP_ID

# Get service principal object ID
SP_OBJECT_ID=$(az ad sp list --filter "appId eq '$APP_ID'" --query "[0].id" -o tsv)

# Assign Contributor role to the service principal
az role assignment create \
  --role Contributor \
  --scope /subscriptions/<your-subscription-id>/resourceGroups/<your-resource-group> \
  --assignee $APP_ID

# Create federated credential for GitHub Actions
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-actions-federated",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:<your-github-username>/<your-repo-name>:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Output the client ID (save this for GitHub secret)
echo "AZURE_CLIENT_ID: $APP_ID"
```

2. **Add secrets to GitHub:**
   - Go to: https://github.com/`<your-username>`/`<your-repo>`/settings/secrets/actions
   - Add the secrets listed above
   - See [GITHUB-SECRETS-SETUP.md](GITHUB-SECRETS-SETUP.md) for detailed instructions

3. **Trigger Deployment:**
   - Push to `main` branch, or
   - Manually trigger from Actions tab

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

## 📊 Storage Containers

- **pig-images** (public blob access) - Temporary image storage (24h retention)
- **pig-results** (private) - JSON analysis results

## 🔒 Security Configuration

- ✅ HTTPS-only traffic enforced
- ✅ TLS 1.2 minimum version
- ✅ System-assigned managed identity for App Service
- ✅ Key Vault integration via app settings
- ✅ Secrets not exposed in app configuration
- ✅ 7-day soft delete for Key Vault
- ✅ 7-day blob retention policy

## 📈 Monitoring

View application logs and metrics:

```bash
# Stream live logs
az webapp log tail --resource-group <your-resource-group> --name <your-app-name>

# View metrics in Azure Portal
https://portal.azure.com/#resource/subscriptions/<your-subscription-id>/resourceGroups/<your-resource-group>/overview
```

## 🔄 Update App Service Configuration

After Terraform updates, restart the App Service to load new Key Vault references:

```bash
az webapp restart \
  --resource-group <your-resource-group> \
  --name <your-app-name>
```

Verify app settings are loading correctly:

```bash
az webapp config appsettings list \
  --resource-group <your-resource-group> \
  --name <your-app-name> \
  --query "[?name=='CONTENT_UNDERSTANDING_ENDPOINT'].value" -o tsv
```

Expected output: `https://<your-ai-services-name>.cognitiveservices.azure.com/`

## 🧹 Cleanup

To remove all resources:

```bash
cd iac
terraform destroy
```

Or via Azure CLI:

```bash
az group delete --name <your-resource-group> --yes --no-wait
```

## 🤖 AI Foundry Setup

The AI Foundry infrastructure includes a hub and project for AI development:

1. **Access AI Studio:** https://ai.azure.com/
2. **Hub:** `<your-hub-name>` - Central workspace for collaboration
3. **Project:** `<your-project-name>` - Linked to the hub with AI Services access
4. **Connect Resources:** AI Services connection is pre-configured via role assignments

### View Hub & Project Details

```bash
# Get hub information
az ml workspace show \
  --name <your-hub-name> \
  --resource-group <your-resource-group>

# Get project information
az ml workspace show \
  --name <your-project-name> \
  --resource-group <your-resource-group>

# View in portal
Hub: https://portal.azure.com/#resource/subscriptions/<your-subscription-id>/resourceGroups/<your-resource-group>/providers/Microsoft.MachineLearningServices/workspaces/<your-hub-name>

Project: https://portal.azure.com/#resource/subscriptions/<your-subscription-id>/resourceGroups/<your-resource-group>/providers/Microsoft.MachineLearningServices/workspaces/<your-project-name>
```

## 📝 Next Steps

1. ✅ Infrastructure deployed
2. ✅ Local environment configured
3. ✅ AI Foundry hub and project provisioned
4. ✅ AI Services configured with role assignments
5. ⏭️ Build and test locally (`npm run dev`)
6. ⏭️ Deploy application to App Service
7. ⏭️ Test production endpoint
8. ⏭️ Explore AI Foundry in AI Studio (https://ai.azure.com/)
9. ⏭️ Configure custom domain (optional)

---

**Terraform State:** Stored locally in `iac/terraform.tfstate`
**Provider Version:** azurerm ~> 4.0
