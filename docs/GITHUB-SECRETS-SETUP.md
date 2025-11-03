# GitHub Secrets Setup Guide

## ✅ Service Principal Created Successfully!

Your Azure service principal with OIDC authentication is ready.

**Application ID:** `<obtained from setup script>`

---

## 📋 Step-by-Step: Add Secrets to GitHub

### 1. Navigate to Repository Secrets

Go to your repository secrets page:
```
https://github.com/<your-username>/<your-repo>/settings/secrets/actions
```

Or manually:
1. Go to your repository on GitHub
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

---

### 2. Add Each Secret

Add the following 4 secrets one by one (values obtained from setup script output):

#### Secret #1: AZURE_CLIENT_ID

```
Name: AZURE_CLIENT_ID
Value: <your-service-principal-app-id>
```

Click **Add secret**

---

#### Secret #2: AZURE_TENANT_ID

```
Name: AZURE_TENANT_ID
Value: <your-azure-tenant-id>
```

Click **Add secret**

---

#### Secret #3: AZURE_SUBSCRIPTION_ID

```
Name: AZURE_SUBSCRIPTION_ID
Value: <your-azure-subscription-id>
```

Click **Add secret**

---

#### Secret #4: AZURE_WEBAPP_NAME

```
Name: AZURE_WEBAPP_NAME
Value: <your-app-service-name>
```

Click **Add secret**

---

## ✅ Verification Checklist

After adding all secrets, verify you have:

- [ ] **AZURE_CLIENT_ID** (from setup script output)
- [ ] **AZURE_TENANT_ID** (from Terraform output or Azure Portal)
- [ ] **AZURE_SUBSCRIPTION_ID** (from Terraform output or Azure Portal)
- [ ] **AZURE_WEBAPP_NAME** (from Terraform output)

---

## 🚀 Trigger Deployment

Once all secrets are configured:

### Option 1: Push to Main Branch
```bash
git add .
git commit -m "Configure GitHub Actions deployment"
git push origin main
```

### Option 2: Manual Trigger
1. Go to **Actions** tab in GitHub
2. Select **Deploy to Azure App Service** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

---

## 📊 Monitor Deployment

After triggering:
1. Go to the **Actions** tab
2. Click on the running workflow
3. Watch the deployment progress in real-time
4. Once complete, access your app at your Azure App Service URL

---

## 🔍 What Was Created

The setup script created:

✅ **Azure AD Application**: Named in the setup script
- Application ID: Output from setup script

✅ **Service Principal**: Linked to the application

✅ **Role Assignment**: Contributor role on your resource group

✅ **Federated Credential**: OIDC authentication for GitHub Actions
- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:<your-org>/<your-repo>:ref:refs/heads/main`

---

## 🛠️ Troubleshooting

### Deployment Fails with "Unauthorized"
- Verify all 4 secrets are correctly added
- Ensure secret names match exactly (case-sensitive)
- Check that the federated credential was created successfully

### Deployment Fails at Azure Login
- Verify the service principal has Contributor role
- Check that the subscription ID is correct

### Need to Re-run Setup
If you need to recreate the service principal:
```bash
# Delete existing app (use the app ID from your setup output)
az ad app delete --id <your-app-id>

# Re-run the setup script
./setup-github-deployment.sh
```

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure OIDC Authentication](https://docs.microsoft.com/azure/developer/github/connect-from-azure)
- [Deployment Workflow](.github/workflows/azure-deploy.yml)
