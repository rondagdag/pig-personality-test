#!/bin/bash

# ==============================================================================
# GitHub Actions Deployment Setup for pig-personality-test
# ==============================================================================
# This script sets up OIDC authentication for GitHub Actions to deploy to Azure
# ==============================================================================

set -e

echo "=============================================================================="
echo "Setting up GitHub Actions deployment with OIDC authentication"
echo "=============================================================================="
echo ""

# Configuration - UPDATE THESE VALUES FOR YOUR ENVIRONMENT
APP_NAME="pig-personality-test-github"
SUBSCRIPTION_ID="<your-azure-subscription-id>"
RESOURCE_GROUP="<your-resource-group-name>"
TENANT_ID="<your-azure-tenant-id>"
WEBAPP_NAME="<your-app-service-name>"
GITHUB_REPO="<your-github-username>/<your-repo-name>"

# ==============================================================================
# STEP 1: Create Azure AD Application
# ==============================================================================

echo "Step 1: Creating Azure AD application '$APP_NAME'..."
APP_CREATION=$(az ad app create --display-name "$APP_NAME" 2>/dev/null || echo "exists")

if [ "$APP_CREATION" = "exists" ]; then
    echo "Application already exists, fetching details..."
fi

echo "Getting application ID..."
APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)

if [ -z "$APP_ID" ]; then
    echo "Error: Could not retrieve application ID"
    exit 1
fi

echo "✓ Application ID: $APP_ID"
echo ""

# ==============================================================================
# STEP 2: Create Service Principal
# ==============================================================================

echo "Step 2: Creating service principal..."
SP_CREATION=$(az ad sp create --id "$APP_ID" 2>/dev/null || echo "exists")

if [ "$SP_CREATION" = "exists" ]; then
    echo "Service principal already exists"
fi

echo "✓ Service principal created/verified"
echo ""

# ==============================================================================
# STEP 3: Assign Contributor Role
# ==============================================================================

echo "Step 3: Assigning Contributor role to service principal..."
SCOPE="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

az role assignment create \
  --role Contributor \
  --scope "$SCOPE" \
  --assignee "$APP_ID" \
  --only-show-errors || echo "Role assignment may already exist"

echo "✓ Contributor role assigned to resource group: $RESOURCE_GROUP"
echo ""

# ==============================================================================
# STEP 4: Create Federated Credential for GitHub Actions
# ==============================================================================

echo "Step 4: Creating federated credential for GitHub Actions..."

FEDERATED_PARAMS=$(cat <<EOF
{
  "name": "github-actions-federated",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:$GITHUB_REPO:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF
)

# Check if federated credential already exists
EXISTING_CRED=$(az ad app federated-credential list --id "$APP_ID" --query "[?name=='github-actions-federated'].name" -o tsv 2>/dev/null || echo "")

if [ -z "$EXISTING_CRED" ]; then
    az ad app federated-credential create \
      --id "$APP_ID" \
      --parameters "$FEDERATED_PARAMS"
    echo "✓ Federated credential created"
else
    echo "✓ Federated credential already exists"
fi

echo ""

# ==============================================================================
# STEP 5: Display GitHub Secrets Configuration
# ==============================================================================

echo "=============================================================================="
echo "✓ Setup Complete!"
echo "=============================================================================="
echo ""
echo "Next Steps: Add these secrets to your GitHub repository"
echo ""
echo "GitHub Repository Settings URL:"
echo "https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "------------------------------------------------------------------------------"
echo "Required GitHub Secrets:"
echo "------------------------------------------------------------------------------"
echo ""
echo "Copy these values to add as GitHub secrets:"
echo ""
echo "Secret Name          | Secret Value"
echo "--------------------|-----------------------------------------"
echo "AZURE_CLIENT_ID     | $APP_ID"
echo "AZURE_TENANT_ID     | $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID | $SUBSCRIPTION_ID"
echo "AZURE_WEBAPP_NAME   | $WEBAPP_NAME"
echo ""
echo "=============================================================================="
echo ""
echo "⚠️  IMPORTANT: Keep these values secure!"
echo "These credentials provide access to your Azure resources."
echo ""
echo "How to add secrets in GitHub:"
echo "1. Go to: https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo "2. Click 'New repository secret'"
echo "3. Add each secret name and value from the table above"
echo "4. Click 'Add secret' after each one"
echo ""
echo "Once all 4 secrets are configured, you can trigger deployment by:"
echo "- Pushing to main branch, or"
echo "- Manually running the workflow from the Actions tab"
echo ""
echo "For detailed instructions, see: GITHUB-SECRETS-SETUP.md"
echo "=============================================================================="
