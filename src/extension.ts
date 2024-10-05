import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('functionFormat');

    if (vscode.window.activeTextEditor) {
        updateDiagnostics(vscode.window.activeTextEditor.document, diagnosticCollection);
    }

    // Update diagnostics when the document is opened or changed
    vscode.workspace.onDidChangeTextDocument(event => {
        updateDiagnostics(event.document, diagnosticCollection);
    });

    vscode.workspace.onDidOpenTextDocument(document => {
        updateDiagnostics(document, diagnosticCollection);
    });

    vscode.languages.registerCodeActionsProvider('python', new FunctionFormatCodeActionProvider(), {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    });

    context.subscriptions.push(diagnosticCollection);
}

class FunctionFormatCodeActionProvider implements vscode.CodeActionProvider {

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] | undefined {
        const diagnostics = context.diagnostics.filter(diagnostic => diagnostic.code === 'functionFormat');

        if (diagnostics.length === 0) {
            return;
        }

        const quickFix = new vscode.CodeAction('Fix function format', vscode.CodeActionKind.QuickFix);
        quickFix.edit = new vscode.WorkspaceEdit(); // Initialize the edit

        // For each diagnostic, fix the function format
        diagnostics.forEach(diagnostic => {
            const lineNumber = diagnostic.range.start.line;
            const functionStartLine = findFunctionStartLine(document, lineNumber);
            const functionName = document.lineAt(functionStartLine).text.match(/^def (\w+)/)?.[1];

            if (functionName) {
                const topComment = `# |-----------------------------------------------------------------------------|`;
                const functionComment = `# ${functionName}`;
                const bottomComment = `# |-------------------------End of ${functionName} ------------------------------|`;

                // Insert the required formatting above the first decorator or function definition
                quickFix.edit!.insert(
                    document.uri,
                    new vscode.Position(functionStartLine, 0),
                    `${topComment}\n${functionComment}\n${topComment}\n`
                );

                // Find the last line of the function to insert the bottom comment after the function body
                const lastFunctionLine = findEndOfFunction(document, lineNumber);
                
                // Insert the bottom comment after the function body
                quickFix.edit!.insert(
                    document.uri,
                    new vscode.Position(lastFunctionLine + 1, 0),
                    `\n${bottomComment}\n`
                );
            }
        });

        return [quickFix];
    }
}

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
    if (document.languageId !== 'python') {
        return;
    }

    const diagnostics: vscode.Diagnostic[] = [];

    for (let i = 0; i < document.lineCount; i++) {
        const functionStartLine = findFunctionStartLine(document, i);
        const functionMatch = document.lineAt(functionStartLine).text.match(/^def (\w+)/);

        if (functionMatch) {
            const functionName = functionMatch[1];
            if (!hasValidFormat(document, functionStartLine, functionName)) {
                const range = new vscode.Range(functionStartLine, 0, functionStartLine, document.lineAt(functionStartLine).text.length);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    `Function '${functionName}' does not follow the required format`,
                    vscode.DiagnosticSeverity.Warning
                );
                diagnostic.code = 'functionFormat';
                diagnostics.push(diagnostic);
            }
        }
    }

    collection.set(document.uri, diagnostics);
}

function hasValidFormat(document: vscode.TextDocument, lineNumber: number, functionName: string): boolean {
    const functionStartLine = findFunctionStartLine(document, lineNumber);

    if (functionStartLine < 3) {
        return false; // Not enough lines above the function to check
    }

    // Get the necessary lines to check the format
    const topBoundaryLine = document.lineAt(functionStartLine - 3).text.trim();
    const functionCommentLine = document.lineAt(functionStartLine - 2).text.trim();
    const middleBoundaryLine = document.lineAt(functionStartLine - 1).text.trim();
    const functionDefinitionLine = document.lineAt(functionStartLine).text.trim();

    // Find the last line of the function
    const lastFunctionLine = findEndOfFunction(document, functionStartLine);
    const bottomBoundaryLine = lastFunctionLine + 1 < document.lineCount ? document.lineAt(lastFunctionLine + 1).text.trim() : '';

    // Check if the format matches the required structure
    return (
        topBoundaryLine === '# |-----------------------------------------------------------------------------|' &&
        functionCommentLine === `# ${functionName}` &&
        middleBoundaryLine === '# |-----------------------------------------------------------------------------|' &&
        functionDefinitionLine.startsWith(`def ${functionName}`)
        // bottomBoundaryLine === `# |-------------------------End of ${functionName}------------------------------|` // Uncomment this line to enable bottom comment check
    );
}

// Function to find the start line of the function block (taking decorators into account)
function findFunctionStartLine(document: vscode.TextDocument, startLine: number): number {
    for (let i = startLine; i < document.lineCount; i++) {
        const line = document.lineAt(i).text.trim();
        if (line.startsWith('def ')) {
            return i; // Return the line number where the function definition is found
        }
        // If a non-decorator line is found before the function definition, stop searching
        if (!line.startsWith('@') && line !== '') {
            return startLine; // Return the original line number if no function is found
        }
    }
    return startLine; // Default to the start line if the function definition is not found
}

// Function to find the last line of the function block
function findEndOfFunction(document: vscode.TextDocument, startLine: number): number {
    const startIndentation = document.lineAt(startLine).firstNonWhitespaceCharacterIndex;

    for (let i = startLine + 1; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const lineText = line.text.trim();
        const currentIndentation = line.firstNonWhitespaceCharacterIndex;

        // If it's an empty line, continue
        if (lineText === "") {
            continue;
        }

        // If we encounter a new function definition or if the indentation is less than the function's indentation
        if (currentIndentation < startIndentation || lineText.startsWith('def ')) {
            return i - 1; // Return the last valid line of the function
        }
    }

    // If we reach the end of the document, return the last line as the end of the function
    return document.lineCount - 1;
}

export function deactivate() {}
