import * as vscode from 'vscode';
import { getDate, getPriorityString, compileStatus, getDueDate } from './content';
import * as globals from './globals'
import { ParsingState, ItemStatus } from './globals'
import { getToday } from './utils';

const tokenTypesLegend = [
    'title',
    'itemClosed',
    'itemObsolete',
    'checkboxOpen',
    'checkboxQuestion',
    'checkboxOngoing',
    'checkboxCompleted',
    'checkboxObsolete',
    'priority',
    'dueDate',
    'dueDateOverdue',
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
        case ItemStatus.Question: return "checkboxQuestion";
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
        }

        return 0;
    }

    private _encodeTokenModifiers(tokenModifier: string): number {
        if (this.tokenModifiers.has(tokenModifier)) {
            return this.tokenModifiers.get(tokenModifier)!;
        }
        
        return 0;
    }

    _getTags(text: string, line_no: number): IParsedToken[] {
        let tokens: IParsedToken[] = []
        let match = globals.TAG_MASK.exec(text);

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

            match = globals.TAG_MASK.exec(text);
        }

        return tokens;
    }

    _parseContent(document: vscode.TextDocument): IParsedToken[] {
        let parsing_state: ParsingState = ParsingState.Start;
        let tokens: IParsedToken[] = [];
        let have_date = false;
        let item_state: ItemStatus = ItemStatus.Unknown;
        const today = getToday();

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;
            if (text.startsWith("\[")) {
                const close_index = text.indexOf("]");
                let next_char = " ";
                let status_char = text.substring(1, close_index);

                if (text.length > close_index + 1) {
                    next_char = text.charAt(close_index + 1);
                }

                if (close_index < 0 || next_char != " " || status_char.length != 1 || globals.VALID_STATUS_CHARS.indexOf(status_char) < 0) {
                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: text.length,
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

                    if (item_state == ItemStatus.Completed) {
                        tokens.push({
                            line: i,
                            startCharacter: 4,
                            length: text.length - 4,
                            tokenType: 'itemClosed',
                            tokenModifier: 'none',
                        });
                    } else if (item_state == ItemStatus.Obsolete) {
                        tokens.push({
                            line: i,
                            startCharacter: 4,
                            length: text.length - 4,
                            tokenType: 'itemObsolete',
                            tokenModifier: 'none',
                        });
                    } else {
                        const date_match = getDate(text);

                        if (date_match.index > 0) {
                            const date = date_match.text;
                            let due_date = getDueDate(date);
                            let token = (due_date < today) ? 'dueDateOverdue' : 'dueDate';

                            tokens.push({
                                line: i,
                                startCharacter: date_match.index - 3,
                                length: date.length + 3,
                                tokenType: token,
                                tokenModifier: 'none',
                            });

                            have_date = true;
                        } else {
                            have_date = false;
                        }

                        const priority = getPriorityString(text);

                        if (priority != "") {
                            tokens.push({
                                line: i,
                                startCharacter: 4,
                                length: priority.length,
                                tokenType: 'priority',
                                tokenModifier: 'none',
                            });
                        }

                        const tag_tokens = this._getTags(text, i);

                        if (tag_tokens.length > 0) {
                            tokens = tokens.concat(tag_tokens);
                        }
                    }

                    parsing_state = ParsingState.TaskHead;
                }
            } else if (text.startsWith("    ") && text.trim() != "") {
                if (parsing_state != ParsingState.TaskHead && parsing_state != ParsingState.TaskBody) {
                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: text.length,
                        tokenType: 'wrongToken',
                        tokenModifier: 'none',
                    });

                    parsing_state = ParsingState.Invalid;
                } else {
                    if (item_state == ItemStatus.Completed) {
                        tokens.push({
                            line: i,
                            startCharacter: 4,
                            length: text.length - 4,
                            tokenType: 'itemClosed',
                            tokenModifier: 'none',
                        });
                    } else if (item_state == ItemStatus.Obsolete) {
                        tokens.push({
                            line: i,
                            startCharacter: 4,
                            length: text.length - 4,
                            tokenType: 'itemObsolete',
                            tokenModifier: 'none',
                        });
                    } else {
                        if (!have_date) {
                            const date_match = getDate(text);

                            if (date_match.index > 0) {
                                const date = date_match.text;
                                let due_date = getDueDate(date);
                                let token = (due_date < today) ? 'dueDateOverdue' : 'dueDate';

                                tokens.push({
                                    line: i,
                                    startCharacter: date_match.index - 3,
                                    length: date.length + 3,
                                    tokenType: token,
                                    tokenModifier: 'none',
                                });

                                have_date = true;
                            }
                        }

                        const tag_tokens = this._getTags(text, i);

                        if (tag_tokens.length > 0) {
                            tokens = tokens.concat(tag_tokens);
                        }
                    }

                    parsing_state = ParsingState.TaskBody;
                }
            } else if (text.trim() == "") {
                parsing_state = ParsingState.BlankLine;
                have_date = false;
            } else {
                if ((parsing_state != ParsingState.Start && parsing_state != ParsingState.BlankLine) || (text.charAt(0).trim() == "")) {
                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: text.length,
                        tokenType: 'wrongToken',
                        tokenModifier: 'none',
                    });

                    parsing_state = ParsingState.Invalid;
                } else {
                    tokens.push({
                        line: i,
                        startCharacter: 0,
                        length: text.length,
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
    const selector = { language: 'xit', scheme: 'file' };
    vscode.languages.registerDocumentSemanticTokensProvider(selector, new XitSemanticTokensProvider, legend);
}
