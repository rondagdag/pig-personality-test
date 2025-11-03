# 🐷 Draw the Pig Personality Test

**Tagline:** Snap your doodle. Get your vibe.

A production-ready web application that analyzes hand-drawn pig drawings to provide personality insights using Azure AI Content Understanding and psychological principles.

> 📚 **[View Complete Documentation Index](docs/DOCS.md)** - All guides, deployment instructions, and development resources

## 🚦 Quickstart

### Local (3 steps)

1. Install deps (npm-only)
   ```bash
   npm install
   ```
2. Create and fill env file
   ```bash
   cp .env.example .env.local
   ```
   Required values in `.env.local`:
   - AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_CONTAINER_NAME=pig-images
   - CONTENT_UNDERSTANDING_ENDPOINT (https://{custom-subdomain}.cognitiveservices.azure.com/)
   - CONTENT_UNDERSTANDING_KEY (subscription key)
   - AI_FOUNDRY_* (from Terraform outputs; not required at runtime today)
3. Run the app
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and verify `GET /api/analyze` returns `{ status: 'ok' }`.

### Cloud (Azure App Service, CI/CD)

1. Provision infra (from `iac/`)
   ```bash
   cd iac
   terraform init
   terraform plan -out=main.tfplan
   terraform apply main.tfplan
   ```
2. Retrieve secrets for local dev (Key Vault)
   ```bash
   az keyvault secret show --vault-name <kv-name> --name content-understanding-key --query value -o tsv
   az keyvault secret show --vault-name <kv-name> --name storage-account-key --query value -o tsv
   ```
   App Service uses Key Vault references; restart after changes:
   ```bash
   az webapp restart --resource-group <rg> --name <app-name>
   ```
3. Configure GitHub Actions (OIDC)
   - Secrets: AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID, AZURE_WEBAPP_NAME
   - Workflow: `.github/workflows/azure-deploy.yml` packages Next.js standalone and deploys via ZIP
4. Deploy
   - Push to `main` or run the workflow manually
   - Or deploy manually using the standalone ZIP steps in “Deployment” below

### Terraform + Key Vault checklist

- [ ] `terraform apply` completed without errors
- [ ] AI Services endpoint (custom subdomain) noted
- [ ] Secrets present in Key Vault (content-understanding-key, storage-account-key)
- [ ] App Service restarted to pick up Key Vault references
- [ ] `.env.local` populated for local runs

## 🌟 Features

- **5-Minute Drawing Timer**: Guided drawing experience with countdown timer
- **Smart Image Upload**: Drag-and-drop or camera capture for mobile
- **AI-Powered Analysis**: Azure AI Content Understanding extracts visual features
- **Personality Insights**: Rule-based engine maps features to personality traits
- **Group Mode**: Upload multiple drawings and compare results with discussion prompts
- **Admin Dashboard**: Export all results as CSV/JSON
- **Privacy-First**: Images automatically deleted after 24 hours

## 📋 Personality Analysis Rubric

The app analyzes your pig drawing based on:

| Feature | Analysis | Interpretation |
|---------|----------|----------------|
| **Vertical Placement** | Top / Middle / Bottom | Optimism level and outlook on life |
| **Orientation** | Left / Right / Front | Tradition vs innovation; interpersonal style |
| **Detail Level** | Many / Few | Analytical vs emotional thinking |
| **Leg Count** | <4 / 4 | Security and stability in life |
| **Ear Size** | Large / Normal | Listening skills and empathy |
| **Tail Length** | Long / Normal | Intelligence indicators |

## 🏗️ Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React Server Components, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **AI Service**: Azure AI Content Understanding (REST API)
- **Storage**: Azure Blob Storage (images + JSON results)
- **Secrets**: Azure Key Vault
- **Infrastructure**: Terraform (IaC)
- **Hosting**: Azure App Service (Linux)
- **Testing**: Jest + React Testing Library

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Azure subscription
- Terraform 1.0+ (for infrastructure deployment)

Note: This project is npm-only (package-lock.json is committed). Do not use pnpm or yarn.

### Local Development

1. **Clone the repository**

   ```bash
   cd pig-personality-test
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in `.env.local` with these values (from Terraform outputs/Key Vault):
   - `AZURE_STORAGE_ACCOUNT_NAME` — storage account name
   - `AZURE_STORAGE_ACCOUNT_KEY` — storage account access key
   - `AZURE_STORAGE_CONTAINER_NAME` — should be `pig-images`
   - `CONTENT_UNDERSTANDING_ENDPOINT` — https://{custom-subdomain}.cognitiveservices.azure.com/
   - `CONTENT_UNDERSTANDING_KEY` — AI Services subscription key
   - `AI_FOUNDRY_HUB_NAME` — hub name
   - `AI_FOUNDRY_HUB_ID` — hub resource ID
   - `AI_FOUNDRY_PROJECT_NAME` — project name
   - `AI_FOUNDRY_PROJECT_ID` — project resource ID

   Tip: The AI Foundry values are provisioned by Terraform for future integrations and aren’t required at runtime today.

4. **Run development server**

   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

5. **Run tests**

   ```bash
   npm test
   ```

## ☁️ Azure Infrastructure Deployment

### Using Terraform

1. **Navigate to infrastructure directory**

   ```bash
   cd iac
   ```

2. **Initialize Terraform**

   ```bash
   terraform init
   ```

3. **Review the plan**

   ```bash
   terraform plan -out=main.tfplan
   ```

4. **Apply infrastructure**

   ```bash
   terraform apply main.tfplan
   ```

5. **Get outputs**

   ```bash
   terraform output
   ```

This provisions:

- ✅ Resource Group
- ✅ Storage Account (with containers: `pig-images`, `pig-results`)
- ✅ Key Vault (stores secrets)
- ✅ Azure AI Services (Content Understanding)
- ✅ Azure AI Foundry Workspace (hub for AI projects)
- ✅ Application Insights (monitoring)
- ✅ App Service Plan + Web App (Linux, Node.js 20)

### Environment Setup After Terraform

Terraform stores secrets in Key Vault. To retrieve them:

```bash
# Get Content Understanding key
az keyvault secret show --vault-name <your-keyvault-name> --name content-understanding-key --query value -o tsv

# Get Storage account key
az keyvault secret show --vault-name <your-keyvault-name> --name storage-account-key --query value -o tsv
```

## 📦 Deployment

### Option 1: Azure App Service (manual ZIP, standalone)

This app uses Next.js standalone output. Package the standalone server and deploy via ZIP:

```bash
# Build production
npm run build

# Create deployment payload (standalone)
rm -rf deploy && mkdir -p deploy/.next/static deploy/public
cp -r .next/standalone/. deploy/
cp -r .next/static/. deploy/.next/static/
[ -d public ] && cp -r public/. deploy/public/ || true

# Add startup script
cat > deploy/startup.sh << 'EOF'
#!/bin/sh
PORT="${PORT:-8080}"
node server.js
EOF
chmod +x deploy/startup.sh

# Zip and deploy
cd deploy && zip -r ../deployment.zip . && cd ..
az webapp deployment source config-zip \
   --resource-group rg-draw-the-pig \
   --name <your-app-service-name> \
   --src deployment.zip \
   --timeout 600
```

### Option 2: GitHub Actions CI/CD

The repo includes a GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) that:

1. Builds the Next.js app (standalone output)
2. Runs tests
3. Packages `.next/standalone` + static + public and adds a `startup.sh`
4. Deploys to Azure App Service via ZIP using OIDC authentication

#### Setup Instructions

1. Create a service principal with federated credentials (see DEPLOYMENT.md for detailed steps)
2. Configure GitHub secrets:
   - `AZURE_CLIENT_ID` - Service principal application ID
   - `AZURE_TENANT_ID` - Your Azure tenant ID
   - `AZURE_SUBSCRIPTION_ID` - Your Azure subscription ID
   - `AZURE_WEBAPP_NAME` - App Service name (e.g., `<your-project-name>-app-<suffix>`)

3. Push to `main` branch or manually trigger the workflow

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup instructions.

### Quick Verify

- Local: http://localhost:3000 should load the app
- Health check: `GET /api/analyze` returns `{ status: 'ok' }`
- Image domains: ensure Azure Blob URLs are allowed (see `next.config.ts` images.remotePatterns)

### Troubleshooting

- Tail logs for App Service:
   ```bash
   az webapp log tail --resource-group <your-resource-group> --name <your-app-name>
   ```
- After changing app settings, restart:
   ```bash
   az webapp restart --resource-group <your-resource-group> --name <your-app-name>
   ```
- More tips in [DEPLOYMENT.md](DEPLOYMENT.md#-monitoring)

## 🧪 Testing

The project includes comprehensive unit tests for the pig rules engine:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

Test coverage includes:

- ✅ Placement analysis (top/middle/bottom)
- ✅ Detail level detection (many/few)
- ✅ Leg count variations (0, 2, 3, 4 legs)
- ✅ Ear size evaluation
- ✅ Tail length assessment
- ✅ Summary generation
- ✅ Edge cases

## 📁 Project Structure

```text
pig-personality-test/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout with navigation
│   ├── page.tsx             # Landing page
│   ├── draw/                # Timer page
│   ├── upload/              # Image upload page
│   ├── results/[id]/        # Individual result view
│   ├── group/               # Group mode
│   │   └── results/         # Group comparison view
│   ├── admin/               # Admin dashboard
│   └── api/
│       └── analyze/         # Analysis API endpoint
├── lib/
│   ├── types.ts             # TypeScript definitions
│   ├── azure/
│   │   └── content-understanding.ts  # Azure REST client
│   ├── scoring/
│   │   └── pigRules.ts      # Personality rules engine
│   └── storage/
│       ├── blob.ts          # Blob storage helpers
│       └── results.ts       # Result persistence
├── iac/                     # Terraform infrastructure
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── tests/
│   └── pigRules.test.ts     # Unit tests
└── README.md
```

## 🔒 Security & Privacy

- **Secrets Management**: All credentials stored in Azure Key Vault
- **Image Retention**: Drawings automatically deleted after 24 hours
- **Private Results**: Analysis results stored in private blob container
- **HTTPS Only**: All traffic encrypted via HTTPS
- **No PII Storage**: No personal information collected beyond drawings

## 🎯 API Reference

### POST /api/analyze

Analyzes a pig drawing and returns personality insights.

**Request:**

```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "participantName": "Optional name"
}
```

**Response:**

```json
{
  "id": "uuid-string",
  "summary": "You have a tendency to be positive...",
  "evidence": [
    {
      "key": "placement=Top",
      "value": 0.25
    }
  ]
}
```

## 📚 Documentation

Detailed documentation is available in the following files:

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete Azure deployment guide
  - Resource inventory and URLs
  - Local development setup
  - Manual and automated deployment options
  - AI Foundry hub and project setup
  - Monitoring and troubleshooting
  - Cleanup instructions

- **[GITHUB-SECRETS-SETUP.md](GITHUB-SECRETS-SETUP.md)** - GitHub Actions CI/CD setup
  - Service principal creation with OIDC
  - Required GitHub secrets configuration
  - Step-by-step deployment pipeline setup

- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Development guidelines
  - Project architecture and patterns
  - Critical conventions and best practices
  - Common pitfalls and solutions
  - File organization and structure

## 🤝 Contributing

This is a demonstration project. For production use:

1. Add rate limiting to `/api/analyze`
2. Implement authentication for admin routes
3. Add monitoring and alerting (Application Insights)
4. Set up automated image cleanup cron job
5. Configure custom domain and SSL

## 📚 References

- [Azure AI Content Understanding Documentation](https://learn.microsoft.com/en-us/azure/ai-services/content-understanding/)
- [Azure AI Content Understanding REST API Quickstart](https://learn.microsoft.com/en-us/azure/ai-services/content-understanding/quickstart/use-rest-api)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Next.js 15 Documentation](https://nextjs.org/docs)

## 📄 License

This project is provided as-is for educational and demonstration purposes.

## 🙏 Acknowledgments

- Psychology-based "Draw the Pig" personality test rubric
- Azure AI Content Understanding team for image analysis capabilities
- Next.js team for the excellent React framework

---

Built with ❤️ using Azure AI and Next.js
