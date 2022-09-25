import * as vscode from 'vscode';

const tokenTypes = ['title', 'item', 'checkbox', 'priority', 'due_date', 'tag'];
const tokenModifiers = ['open', 'closed'];
const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

class XitSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    provideDocumentSemanticTokens(
        document: vscode.TextDocument
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        // analyze the document and return semantic tokens

        const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
        // on line 1, characters 1-5 are a class declaration
        tokensBuilder.push(
            new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 5)),
            'class',
            ['declaration']
        );
        return tokensBuilder.build();
    }
};


export function registerSemanticProvider() {
    const selector = { language: 'xit', scheme: 'file' }; // register for all Java documents from the local file system
    vscode.languages.registerDocumentSemanticTokensProvider(selector, new XitSemanticTokensProvider, legend);
}
