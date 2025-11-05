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
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
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
  subscription_id = var.subscription_id
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
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "blob"
}

resource "azurerm_storage_container" "results" {
  name               = "pig-results"
  storage_account_id = azurerm_storage_account.main.id
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

# Maintain backward compatibility - store AI Services credentials with original names
resource "azurerm_key_vault_secret" "content_understanding_key" {
  name         = "content-understanding-key"
  value        = azurerm_ai_services.main.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "content_understanding_endpoint" {
  name         = "content-understanding-endpoint"
  value        = azurerm_ai_services.main.endpoint
  key_vault_id = azurerm_key_vault.main.id
}

# Azure AI Services (replaces azurerm_cognitive_account for AI Foundry compatibility)
resource "azurerm_ai_services" "main" {
  name                  = "${var.project_name}-aiservices-${random_string.suffix.result}"
  location              = azurerm_resource_group.main.location
  resource_group_name   = azurerm_resource_group.main.name
  sku_name              = "S0"
  custom_subdomain_name = "${var.project_name}-aiservices-${random_string.suffix.result}"
  
  tags = var.tags
}

# Store AI Services key in Key Vault
resource "azurerm_key_vault_secret" "ai_services_key" {
  name         = "ai-services-key"
  value        = azurerm_ai_services.main.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

# Store AI Services endpoint in Key Vault
resource "azurerm_key_vault_secret" "ai_services_endpoint" {
  name         = "ai-services-endpoint"
  value        = azurerm_ai_services.main.endpoint
  key_vault_id = azurerm_key_vault.main.id
}

# Azure AI Foundry Hub
resource "azurerm_ai_foundry" "hub" {
  name                = "${var.project_name}-hub-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  storage_account_id  = azurerm_storage_account.main.id
  key_vault_id        = azurerm_key_vault.main.id
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = merge(var.tags, {
    Purpose = "AI Foundry Hub"
  })
}

# Azure AI Foundry Project
# Connected to AI Services resource for Content Understanding and AI models
resource "azurerm_ai_foundry_project" "project" {
  name               = "${var.project_name}-project-${random_string.suffix.result}"
  location           = azurerm_ai_foundry.hub.location
  ai_services_hub_id = azurerm_ai_foundry.hub.id
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = merge(var.tags, {
    Purpose = "AI Foundry Project"
  })
}

# Generate AI Services connection YAML file from template
resource "local_file" "ai_services_connection_yml" {
  content = templatefile("${path.module}/aiservices-connection.yml", {
    ai_services_endpoint    = azurerm_ai_services.main.endpoint
    ai_services_resource_id = azurerm_ai_services.main.id
  })
  filename = "${path.module}/aiservices-connection-generated.yml"
}

# Create AI Services connection to AI Foundry Project using Azure CLI
# This enables Content Understanding and AI model access within the AI Foundry Project
resource "null_resource" "ai_services_connection" {
  depends_on = [
    azurerm_ai_foundry_project.project,
    azurerm_ai_services.main,
    local_file.ai_services_connection_yml,
    azurerm_role_assignment.project_ai_services
  ]
  
  provisioner "local-exec" {
    command = <<-EOT
      az ml connection show \
        --name aiservices-connection \
        --resource-group ${azurerm_resource_group.main.name} \
        --workspace-name ${azurerm_ai_foundry_project.project.name} >/dev/null 2>&1 || \
      az ml connection create \
        --file ${local_file.ai_services_connection_yml.filename} \
        --resource-group ${azurerm_resource_group.main.name} \
        --workspace-name ${azurerm_ai_foundry_project.project.name}
    EOT
  }
  
  # Trigger recreation if AI Services resource changes
  triggers = {
    ai_services_id = azurerm_ai_services.main.id
    project_id     = azurerm_ai_foundry_project.project.id
    yaml_content   = local_file.ai_services_connection_yml.content
  }
}

# Grant AI Foundry Hub managed identity access to AI Services
resource "azurerm_role_assignment" "hub_ai_services" {
  scope                = azurerm_ai_services.main.id
  role_definition_name = "Cognitive Services User"
  principal_id         = azurerm_ai_foundry.hub.identity[0].principal_id
}

# Grant AI Foundry Project managed identity access to AI Services
resource "azurerm_role_assignment" "project_ai_services" {
  scope                = azurerm_ai_services.main.id
  role_definition_name = "Cognitive Services User"
  principal_id         = azurerm_ai_foundry_project.project.identity[0].principal_id
}

# Note: The AI Services connection to AI Foundry Project is established through:
# 1. The role assignment above (grants the project's managed identity access)
# 2. The project's ai_services_hub_id pointing to the hub that has access to AI Services
# 3. App settings in the App Service that reference the AI Services endpoint and key
# No separate connection resource is needed in Terraform for basic AI Services access.

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
    CONTENT_UNDERSTANDING_ENDPOINT = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.content_understanding_endpoint.id})"
    CONTENT_UNDERSTANDING_KEY      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.content_understanding_key.id})"
    
    # Next.js settings
    WEBSITE_NODE_DEFAULT_VERSION = "20-lts"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "false"
    
    # Startup command for standalone build
    WEBSITE_RUN_FROM_PACKAGE = "1"
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
