import * as vscode from 'vscode';
import { getToday } from './utils'

export interface CountDetails {
    last_change: string;
    started: number;
    completed: number;
    obsolete: number;
}

export class XitDataStore {
    storage: vscode.Memento;

    constructor(storage: vscode.Memento) {
        this.storage = storage;
     }
    
    public getCounts(filename: string): CountDetails | undefined {
        const counts = this.storage.get<CountDetails>(filename);

        if (counts === undefined || counts.last_change < getToday()) {
            const output = {
                last_change: getToday(),
                started: 0,
                completed: 0,
                obsolete: 0
            }

            return output;
        } else {
            return counts;
        }
    }
    
    public setCounts(filename: string, counts: CountDetails) {
        this.storage.update(filename, counts);
    }
}
