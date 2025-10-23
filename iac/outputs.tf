output "resource_group_name" {
  description = "Name of the created resource group"
  value       = azurerm_resource_group.main.name
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.main.name
}

output "storage_account_connection_string" {
  description = "Storage account connection string"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "ai_foundry_endpoint" {
  description = "Azure AI Foundry (Content Understanding) endpoint"
  value       = azurerm_cognitive_account.ai_foundry.endpoint
}

output "ai_foundry_key" {
  description = "Azure AI Foundry (Content Understanding) primary key"
  value       = azurerm_cognitive_account.ai_foundry.primary_access_key
  sensitive   = true
}

output "app_service_name" {
  description = "Name of the App Service"
  value       = azurerm_linux_web_app.main.name
}

output "app_service_default_hostname" {
  description = "Default hostname of the App Service"
  value       = azurerm_linux_web_app.main.default_hostname
}

output "app_service_url" {
  description = "Full URL of the deployed application"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "deployment_instructions" {
  description = "Instructions for deploying the application"
  value       = <<-EOT
    Deployment Instructions:
    
    1. Copy environment variables to local .env.local:
       AZURE_STORAGE_ACCOUNT_NAME="${azurerm_storage_account.main.name}"
       AZURE_STORAGE_ACCOUNT_KEY="<from Key Vault or sensitive output>"
       CONTENT_UNDERSTANDING_ENDPOINT="${azurerm_cognitive_account.ai_foundry.endpoint}"
       CONTENT_UNDERSTANDING_KEY="<from Key Vault or sensitive output>"
    
    2. Build and deploy your Next.js app:
       npm run build
       
    3. Deploy to App Service:
       az webapp deployment source config-zip --resource-group ${azurerm_resource_group.main.name} --name ${azurerm_linux_web_app.main.name} --src <path-to-zip>
       
       Or use GitHub Actions CI/CD (see .github/workflows/azure-deploy.yml)
    
    4. Access your application:
       ${azurerm_linux_web_app.main.default_hostname}
    
    5. View secrets in Key Vault:
       az keyvault secret show --vault-name ${azurerm_key_vault.main.name} --name content-understanding-key
  EOT
}
