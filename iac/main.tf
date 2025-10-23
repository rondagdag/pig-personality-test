# Terraform configuration for Draw the Pig Personality Test
# Provisions Azure infrastructure: RG, Storage, Key Vault, AI Foundry, App Service

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
      recover_soft_deleted_key_vaults = true
    }
  }
  subscription_id = "00000000-0000-0000-0000-000000000000"
}

# Current Azure client configuration
data "azurerm_client_config" "current" {}

# Random suffix for unique resource names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  
  tags = var.tags
}

# Storage Account for images and results
resource "azurerm_storage_account" "main" {
  name                     = "${var.project_name}${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  # Security settings
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = true
  
  blob_properties {
    delete_retention_policy {
      days = 7
    }
  }
  
  tags = var.tags
}

# Blob containers
resource "azurerm_storage_container" "images" {
  name                  = "pig-images"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "blob"
}

resource "azurerm_storage_container" "results" {
  name                 = "pig-results"
  storage_account_name = azurerm_storage_account.main.name
  # No public access (container_access_type defaults to private when omitted)
}

# Key Vault for secrets
resource "azurerm_key_vault" "main" {
  name                       = "${var.project_name}-kv-${random_string.suffix.result}"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id
    
    secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Purge",
      "Recover"
    ]
  }
  
  tags = var.tags
}

# Store storage account key in Key Vault
resource "azurerm_key_vault_secret" "storage_key" {
  name         = "storage-account-key"
  value        = azurerm_storage_account.main.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

# AI Foundry Resource (Azure AI Services)
# CRITICAL: Content Understanding requires AIServices with custom_subdomain_name
# Generic CognitiveServices endpoint (westus.api.cognitive.microsoft.com) will NOT work
resource "azurerm_cognitive_account" "ai_foundry" {
  name                = "${var.project_name}-ai-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  kind                = "AIServices"
  sku_name            = "S0"
  custom_subdomain_name = "${var.project_name}-ai-${random_string.suffix.result}"
  
  tags = var.tags
}

# Store AI Foundry key in Key Vault
resource "azurerm_key_vault_secret" "ai_foundry_key" {
  name         = "content-understanding-key"
  value        = azurerm_cognitive_account.ai_foundry.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

# Store AI Foundry endpoint in Key Vault
resource "azurerm_key_vault_secret" "ai_foundry_endpoint" {
  name         = "content-understanding-endpoint"
  value        = azurerm_cognitive_account.ai_foundry.endpoint
  key_vault_id = azurerm_key_vault.main.id
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${var.project_name}-plan-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "B1" # Basic tier for production
  
  tags = var.tags
}

# App Service (Web App)
resource "azurerm_linux_web_app" "main" {
  name                = "${var.project_name}-app-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id
  
  site_config {
    always_on = true
    
    application_stack {
      node_version = "20-lts"
    }
  }
  
  app_settings = {
    # Azure Storage
    AZURE_STORAGE_ACCOUNT_NAME  = azurerm_storage_account.main.name
    AZURE_STORAGE_ACCOUNT_KEY   = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.storage_key.id})"
    AZURE_STORAGE_CONTAINER_NAME = "pig-images"
    
    # Azure AI Content Understanding
    CONTENT_UNDERSTANDING_ENDPOINT = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.ai_foundry_endpoint.id})"
    CONTENT_UNDERSTANDING_KEY      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.ai_foundry_key.id})"
    
    # Next.js settings
    WEBSITE_NODE_DEFAULT_VERSION = "20-lts"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = var.tags
}

# Grant App Service access to Key Vault
resource "azurerm_key_vault_access_policy" "app_service" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.main.identity[0].principal_id
  
  secret_permissions = [
    "Get",
    "List"
  ]
}
