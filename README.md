# 🐷 Draw the Pig Personality Test

**Tagline:** Snap your doodle. Get your vibe.

A production-ready web application that analyzes hand-drawn pig drawings to provide personality insights using Azure AI Content Understanding and psychological principles.

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

- Node.js 20+ and npm/pnpm
- Azure subscription
- Terraform 1.0+ (for infrastructure deployment)

### Local Development

1. **Clone the repository**
   ```bash
   cd pig-personality-test
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Azure credentials:
   - `AZURE_STORAGE_ACCOUNT_NAME`: Your storage account name
   - `AZURE_STORAGE_ACCOUNT_KEY`: Storage account access key
   - `CONTENT_UNDERSTANDING_ENDPOINT`: AI Foundry endpoint URL
   - `CONTENT_UNDERSTANDING_KEY`: AI Foundry subscription key

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
- ✅ Azure AI Foundry (Content Understanding)
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

### Option 1: Azure App Service Deployment

```bash
# Build production
npm run build

# Create deployment package
zip -r deploy.zip .next public package.json package-lock.json next.config.ts

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group rg-draw-the-pig \
  --name <your-app-service-name> \
  --src deploy.zip
```

### Option 2: GitHub Actions CI/CD

The repo includes a GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) that:
1. Builds the Next.js app
2. Runs tests
3. Deploys to Azure App Service using OIDC authentication

Set up the following GitHub secrets:
- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_WEBAPP_NAME`

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

```
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
