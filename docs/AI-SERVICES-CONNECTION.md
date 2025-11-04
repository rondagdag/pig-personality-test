# AI Services Connection Setup

## Overview
Successfully created and connected Azure AI Services to the AI Foundry Project using Terraform automation.

## What Was Created

### 1. Connection Template (`aiservices-connection.yml`)
- YAML template file for defining the AI Services connection
- Uses Terraform's `templatefile()` function to inject dynamic values
- Schema-compliant with Azure ML connection schema

### 2. Terraform Resources
- **`local_file.ai_services_connection_yml`**: Generates the connection YAML file with actual resource IDs
- **`null_resource.ai_services_connection`**: Creates the connection using Azure CLI (`az ml connection create`)
- Automatically checks if connection exists before creating to avoid duplicates

### 3. Connection Details
- **Name**: `aiservices-connection`
- **Type**: `azure_ai_services`
- **Endpoint**: `https://<your-ai-services-name>.cognitiveservices.azure.com/`
- **Resource ID**: Full Azure resource path to the AI Services account (use your own resource ID)

## How It Works

1. **Template Processing**: Terraform reads the template and injects your actual AI Services endpoint and resource ID
2. **File Generation**: Creates `aiservices-connection-generated.yml` with the populated values
3. **Connection Creation**: Runs `az ml connection create` to register the connection in your AI Foundry Project
4. **Idempotency**: Checks if connection exists first, only creates if needed

## Benefits

- **Content Understanding Access**: Your AI Foundry Project can now use Content Understanding APIs
- **Custom Analyzer Support**: Enables the `pig-feature-analyzer` custom analyzer we created
- **Automated Management**: Connection is tracked in Terraform state and automatically recreated if resources change
- **Infrastructure as Code**: Connection definition is version-controlled and repeatable

## Verification

Check the connection status:
```bash
az ml connection show \
  --name aiservices-connection \
  --resource-group <your-resource-group> \
  --workspace-name <your-workspace-name>
```

Or view in Azure AI Foundry Portal:
- Navigate to: https://ai.azure.com/
- Select your project: `<your-workspace-name>`
- View connections under project settings

## Next Steps

1. ✅ Custom analyzer created (`pig-feature-analyzer`)
2. ✅ AI Services connected to AI Foundry Project
3. Ready to use Content Understanding in your application
4. Test the analyzer with a pig drawing:
   ```bash
   npm test
   # or
   npm run dev
   ```

## Files Modified

- `iac/main.tf` - Added connection resources
- `iac/aiservices-connection.yml` - Connection template
- `iac/outputs.tf` - Added connection file output
- `.gitignore` - Excluded generated YAML file
