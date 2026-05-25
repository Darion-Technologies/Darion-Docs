# Getting Started

Build a local Darion documentation workspace that is easy to run, inspect, and
extend. This guide follows the same structure as a technical article: first the
conceptual model, then the concrete sequence, then the validation artifact.

## Overview

Darion Docs uses VitePress to transform Markdown into a static documentation
site. The site keeps source files close to the system they describe, while the
theme layer controls navigation, typography, search, and the Apple-inspired
visual presentation.

The recommended workflow is to write conceptual pages before reference pages.
That order helps readers understand why a module exists before they inspect
request fields, response envelopes, or operational limits.

## Prepare the Workspace

### 1. Install dependencies

From the repository root, run the package installation command.

```sh
npm install
```

### 2. Start the local documentation server

Run the VitePress development server and open the printed local URL.

```sh
npm run docs:dev
```

### 3. Add a new article

Create a Markdown file under **docs** and link it from
**.vitepress/config.mjs**. Keep the title short, then use the first paragraph to
define the reader's goal.

### 4. Validate the production build

Before publishing, generate the static site.

```sh
npm run docs:build
```

## Configure an Integration

Use a small configuration file to describe the target environment. The example
below keeps credentials outside the repository and names only stable runtime
values.

```json
{
  "service": "darion-docs",
  "environment": "local",
  "baseUrl": "http://localhost:5173",
  "features": {
    "localSearch": true,
    "lastUpdated": true,
    "cleanUrls": true
  }
}
```

## Validate with a Script

The following Python snippet checks that the local site responds successfully.
It is intentionally small so it can be adapted for a CI smoke test.

```python
from urllib.request import urlopen


def assert_docs_available(url: str) -> None:
    """Raise an error if the documentation site is not reachable."""
    with urlopen(url, timeout=5) as response:
        status = response.getcode()

    if status != 200:
        raise RuntimeError(f"Expected HTTP 200 from {url}, received {status}")


if __name__ == "__main__":
    assert_docs_available("http://localhost:5173")
    print("Darion Docs is available.")
```

## Next Steps

After the local server is running, review **Architecture** for system boundaries
and **API Specifications** for interface-level contracts.
