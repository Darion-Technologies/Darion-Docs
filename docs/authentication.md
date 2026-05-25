---
title: "Authentication"
group: "Core Modules"
order: 20
status: "published"
owner: "docs"
tags: ""
visibility: "public"
---
# Authentication

Describe how Darion services authenticate requests.

## Overview

Darion APIs use token-based authentication for service access. Keep credentials
outside source control and rotate tokens through the approved environment
workflow.

## Example

```json
{
  "Authorization": "Bearer <token>"
}
```
