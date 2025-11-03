# 📚 Documentation Index

Complete documentation for the Draw the Pig Personality Test application.

## 📖 Core Documentation

### [README.md](README.md)
**Main project overview and quick start guide**
- Features and technology stack
- Local development setup
- Testing instructions
- Project structure
- API reference

### [DEPLOYMENT.md](DEPLOYMENT.md)
**Azure infrastructure and deployment guide**
- Deployed resources inventory
- Infrastructure as Code (Terraform)
- Local development environment setup
- Manual and automated deployment
- AI Foundry hub and project configuration
- Monitoring and logging
- Troubleshooting and cleanup

### [GITHUB-SECRETS-SETUP.md](GITHUB-SECRETS-SETUP.md)
**CI/CD pipeline configuration**
- Service principal creation with OIDC
- GitHub Actions setup
- Required secrets configuration
- Deployment workflow

### [SECURITY-AUDIT.md](SECURITY-AUDIT.md)
**Security audit and sensitive data masking report**
- Complete list of masked values
- Protected files (gitignored)
- Verification results
- Security best practices applied

### [GIT-HISTORY-AUDIT.md](GIT-HISTORY-AUDIT.md)
**Git history security audit**
- Complete git history scan for sensitive data
- Verification that no credentials were ever committed
- Analysis of tracked files and remote repository
- Commands to verify audit findings yourself

## 🛠️ Development Guidelines

### [.github/copilot-instructions.md](.github/copilot-instructions.md)
**AI assistant guidelines and project architecture**
- Critical architecture patterns
- Azure AI integration specifics
- Data flow pipeline
- Type system conventions
- Next.js 15 App Router best practices
- Rules engine implementation
- Infrastructure as Code (Terraform) details
- Common pitfalls and solutions

## 📋 Configuration Files

### Environment Variables
- **`.env.example`** - Template for environment variables
- **`.env.local`** - Local development configuration (gitignored)

### Infrastructure as Code
- **`iac/terraform.tfvars.example`** - Template for Terraform variables
- **`iac/terraform.tfvars`** - Your Terraform configuration (gitignored)
- **`iac/main.tf`** - Azure resources definition
- **`iac/variables.tf`** - Input variable definitions
- **`iac/outputs.tf`** - Exported resource identifiers

### Scripts
- **`setup-github-deployment.sh`** - Automated service principal setup script

## 🎯 Quick Navigation

### Getting Started
1. Read [README.md](README.md) for project overview
2. Follow local development setup in [README.md](README.md#-getting-started)
3. Deploy infrastructure using [DEPLOYMENT.md](DEPLOYMENT.md#%EF%B8%8F-azure-infrastructure-deployment)

### Deploying to Azure
1. Run Terraform to provision resources ([DEPLOYMENT.md](DEPLOYMENT.md))
2. Configure GitHub Actions ([GITHUB-SECRETS-SETUP.md](GITHUB-SECRETS-SETUP.md))
3. Push to main branch to trigger deployment

### Development
1. Review architecture in [.github/copilot-instructions.md](.github/copilot-instructions.md)
2. Run tests: `npm test`
3. Start dev server: `npm run dev`

### Troubleshooting
- Infrastructure issues → [DEPLOYMENT.md - Troubleshooting](DEPLOYMENT.md#-monitoring)
- GitHub Actions issues → [GITHUB-SECRETS-SETUP.md](GITHUB-SECRETS-SETUP.md)
- Development issues → [.github/copilot-instructions.md - Common Pitfalls](.github/copilot-instructions.md#common-pitfalls)

## 🔒 Security Notes

All documentation files have been sanitized to remove sensitive information:
- Subscription IDs replaced with `<your-subscription-id>`
- Tenant IDs replaced with `<your-tenant-id>`
- Resource names replaced with `<your-resource-name>`
- GitHub repository paths replaced with `<your-username>/<your-repo>`

**Files containing real credentials (gitignored):**
- `.env.local`
- `iac/terraform.tfvars`
- `iac/terraform.tfstate`
- `iac/*.tfplan`

## 📞 Support

For questions or issues:
1. Check the [Common Pitfalls](.github/copilot-instructions.md#common-pitfalls) section
2. Review [Azure AI Content Understanding Documentation](https://learn.microsoft.com/azure/ai-services/content-understanding/)
3. Check [Next.js 15 Documentation](https://nextjs.org/docs)

## 🔄 Document Updates

When updating documentation:
- ✅ Keep all sensitive values masked
- ✅ Use placeholder format: `<description-of-value>`
- ✅ Update this index if adding new documentation files
- ✅ Ensure `.gitignore` protects credential files
