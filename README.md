# PythoNinja

## Overview

**PythoNinja** is a VS Code extension designed to enhance your Python coding experience by enforcing specific formatting and documentation standards for function definitions. It helps maintain code quality and readability by ensuring that every function includes necessary docstrings and follows a defined structure.

## Features

- **Docstring Verification**: Automatically checks for the presence of docstrings in Python functions to encourage thorough documentation.
- **Custom Formatting Rules**: Enforces a specific formatting style for function definitions, including header and footer comments.
- **Real-time Feedback**: Provides immediate warnings when functions do not adhere to the specified formatting, helping you correct issues on the fly.
- **Configurable Settings**: Customize formatting rules to fit your coding style or team standards.

## Installation

1. Install the extension from the VS Code Marketplace:
   - Search for **PythoNinja** in the Extensions view (`Ctrl+Shift+X`).
   - Click **Install**.

2. Alternatively, you can install it from the VSIX file:
   ```bash
   npm run compile
   vsce package
   code --install-extension <path-to-your-vsix-file>
