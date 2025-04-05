[Synterix website](https://synterix.cloud)

The **Synterix CLI** (version 1.0.0) is a command-line toolkit designed for managing local workspaces and proxy configurations. It provides an intuitive interface for developers to efficiently handle development environments and network proxy settings.

```aiignore
Usage: synterix [options] [command]

Synterix CLI toolkit 1.0.0

workspace|ws           Manage local workspaces
  create          create a new workspace
  remove          remove a workspace
  toggle          toggle a workspace as default
  list            list all local workspace
  host            set a workspace host
  token           set a workspace token

proxy|px           Manage local proxies
  add             create a new proxy
  remove          remove a proxy
  list            list all local proxies
  start           start a proxy
  stop            stop a proxy

Options:
  -V, --version                  output the version number

```

## Install

```aiignore
npm install -g synterix-cli
```
### Workspace Management (`workspace` or `ws`)

- **`create`** – Create a new workspace
- **`remove`** – Delete an existing workspace
- **`toggle`** – Set a workspace as the default
- **`list`** – List all local workspaces
- **`host`** – Configure a workspace host URL
- **`token`** – Set an authentication token for a workspace

### Proxy Management (`proxy` or `px`)

- **`add`** – Add a new proxy configuration
- **`remove`** – Remove an existing proxy
- **`list`** – List all configured proxies
- **`start`** – Start a proxy service
- **`stop`** – Stop a running proxy

## Global Options

- **`-V, --version`** – Display the current CLI version

## Common Use Cases

1. **Setting Up a Development Workspace**
   ```bash
   synterix ws create my-project  
   synterix ws host my-project https://api.example.com  
   synterix ws token my-project my-secret-token  
   ```  

2. **Managing Proxy Services**
   ```bash
   synterix px add my-proxy --port 8080  
   synterix px start my-proxy  
   synterix px list  
   ```  

3. **Switching Default Workspace**
   ```bash
   synterix ws toggle my-project  
   ```  