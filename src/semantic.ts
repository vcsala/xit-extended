import * as vscode from 'vscode';
import { ParsingState, getDate, getPriorityString, compileStatus, ItemStatus } from './content';

const tokenTypesLegend = [
    'title', 
    'itemClosed', 
    'checkboxOpen', 
    'checkboxOngoing',
    'checkboxCompleted', 
    'checkboxObsolete', 
    'priority', 
    'dueDate', 
    'tag',
    'wrongToken'
];
const tokenModifiersLegend = ['none'];
const legend = new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);

interface IParsedToken {
    line: number;
    startCharacter: number;
    length: number;
    tokenType: string;
    tokenModifier: string;
}

function translateToCheckboxScope(status: ItemStatus): string {
    switch (status) {
        case ItemStatus.Open: return "checkboxOpen";
        case ItemStatus.Ongoing: return "checkboxOngoing";
        case ItemStatus.Completed: return "checkboxCompleted";
        case ItemStatus.Obsolete: return "checkboxObsolete";
        default: return "";
    }
}

class XitSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
    tokenTypes: Map<string, number>;
    tokenModifiers: Map<string, number>;

    constructor() {
        this.tokenTypes = new Map<string, number>();
        this.tokenModifiers = new Map<string, number>();

        tokenTypesLegend.forEach((tokenType, index) => this.tokenTypes.set(tokenType, index));
        tokenModifiersLegend.forEach((tokenModifier, index) => this.tokenModifiers.set(tokenModifier, index));
    }

    provideDocumentSemanticTokens(
        document: vscode.TextDocument
    ): vscode.ProviderResult<vscode.SemanticTokens> {
        const allTokens = this._parseContent(document);
        const builder = new vscode.SemanticTokensBuilder();
        allTokens.forEach((token) => {
            builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifier));
        });
        return builder.build();
    }

    private _encodeTokenType(tokenType: string): number {
        if (this.tokenTypes.has(tokenType)) {
            return this.tokenTypes.get(tokenType)!;
        } else if (tokenType === 'notInLegend') {
            return this.tokenTypes.size + 2;
        }
        return 0;
    }

    private _encodeTokenModifiers(tokenModifier: string): number {
        if (this.tokenModifiers.has(tokenModifier)) {
            return this.tokenModifiers.get(tokenModifier)!;
        } else if (tokenModifier === 'notInLegend') {
            return this.tokenModifiers.size + 2;
        }
        return 0;
    }

    _getTags(text: string, line_no: number): IParsedToken[] {
        const re = /#[\p{L}\p{N}_\-]+(?:=[\p{L}\p{N}_\-]+|="[^"\n]*"|='[^'\n]*')?/ug;
        let tokens: IParsedToken[] = []
        let match = re.exec(text);

        while (match) {
            const tag = match[0];

            if (tag != "") {
                tokens.push({
                    line: line_no,
                    startCharacter: match.index,
                    length: tag.length,
                    tokenType: 'tag',
                    tokenModifier: 'none',
                });
            }

            match = re.exec(text);
        }

        return tokens;
    }

    _parseContent(document: vscode.TextDocument): IParsedToken[] {
        let parsing_state: ParsingState = ParsingState.Start;
        let tokens: IParsedToken[] = [];
        let have_date = false;
        let item_state: ItemStatus = ItemStatus.Unknown;

        for (let i = 0; i < document.lineCount; i++) {
            let line = document.lineAt(i);
            if (line.text.startsWith("\[")) {
                const close_index = line.text.indexOf("]");
                let next_char = " ";
                let status_char = line.text.substring(1, close_index);

                if (line.text.length > close_index + 1) {
                    next_char = line.text.charAt(close_index + 1);
                }

                if (close_index < 0 || next_char != " " || status_char.length > 1 || " @x~".indexOf(status_char) < 0) {
                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: line.text.length,
                        tokenType: 'wrongToken',
                        tokenModifier: 'none',
                    });

                    parsing_state = ParsingState.Invalid;
                } else {
                    item_state = compileStatus(status_char);

                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: close_index + 1,
                        tokenType: translateToCheckboxScope(item_state),
                        tokenModifier: 'none',
                    });

                    if (item_state == ItemStatus.Completed || item_state == ItemStatus.Obsolete) {
                        tokens.push({
                            line: i,
                            startCharacter: 4,
                            length: line.text.length - 4,
                            tokenType: 'itemClosed',
                            tokenModifier: 'none',
                        });
                    } else {
                        const date_match = getDate(line.text);

                        if (date_match[1] > 0) {
                            const date = date_match[0];

                            tokens.push({
                                line: i,
                                startCharacter: date_match[1] - 3,
                                length: date_match[0].length + 3,
                                tokenType: 'dueDate',
                                tokenModifier: 'none',
                            });

                            have_date = true;
                        } else {
                            have_date = false;
                        }

                        const priority = getPriorityString(line.text);

                        if (priority != "") {
                            tokens.push({
                                line: i,
                                startCharacter: 4,
                                length: priority.length,
                                tokenType: 'priority',
                                tokenModifier: 'none',
                            });
                        }

                        const tag_tokens = this._getTags(line.text, i);

                        if (tag_tokens.length > 0) {
                            tokens = tokens.concat(tag_tokens);
                        }
                    }

                    parsing_state = ParsingState.TaskHead;
                }
            } else if (line.text.startsWith("    ") && line.text.trim() != "") {
                if (parsing_state != ParsingState.TaskHead && parsing_state != ParsingState.TaskBody) {
                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: line.text.length,
                        tokenType: 'wrongToken',
                        tokenModifier: 'none',
                    });

                    parsing_state = ParsingState.Invalid;
                } else {
                    if (item_state == ItemStatus.Completed || item_state == ItemStatus.Obsolete) {
                        tokens.push({
                            line: i,
                            startCharacter: 4,
                            length: line.text.length - 4,
                            tokenType: 'itemClosed',
                            tokenModifier: 'none',
                        });
                    } else {
                        if (!have_date) {
                            const date_match = getDate(line.text);

                            if (date_match[1] > 0) {
                                const date = date_match[0];

                                tokens.push({
                                    line: i,
                                    startCharacter: date_match[1] - 3,
                                    length: date_match[0].length + 3,
                                    tokenType: 'dueDate',
                                    tokenModifier: 'none',
                                });

                                have_date = true;
                            }
                        }

                        const tag_tokens = this._getTags(line.text, i);

                        if (tag_tokens.length > 0) {
                            tokens = tokens.concat(tag_tokens);
                        }
                    }

                    parsing_state = ParsingState.TaskBody;
                }
            } else if (line.text.trim() == "") {
                parsing_state = ParsingState.BlankLine;
                have_date = false;
            } else {
                if ((parsing_state != ParsingState.Start && parsing_state != ParsingState.BlankLine) || (line.text.charAt(0).trim() == "")) {
                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: line.text.length,
                        tokenType: 'wrongToken',
                        tokenModifier: 'none',
                    });

                    parsing_state = ParsingState.Invalid;
                } else {
                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: line.text.length,
                        tokenType: 'title',
                        tokenModifier: '',
                    });
    
                    have_date = false;
                    parsing_state = ParsingState.Title;    
                }
            }
        }

        return tokens;
    }
};


export function registerSemanticProvider() {
    const selector = { language: 'xit', scheme: 'file' }; // register for all Java documents from the local file system
    vscode.languages.registerDocumentSemanticTokensProvider(selector, new XitSemanticTokensProvider, legend);
}
