import * as fs from 'fs';
import * as path from 'path';
import { getGameRoot } from './game-path';

class Logger {
    private logFile: string;

    constructor() {
        const rootDir = getGameRoot();
        if (!fs.existsSync(rootDir)) {
            fs.mkdirSync(rootDir, { recursive: true });
        }
        this.logFile = path.join(rootDir, 'launcher.log');
    }

    private formatMessage(level: string, message: any): string {
        const timestamp = new Date().toISOString();
        const content = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
        return `[${timestamp}] [${level}] ${content}\n`;
    }

    private writeToFile(msg: string) {
        try {
            fs.appendFileSync(this.logFile, msg);
        } catch (e) {
            // Silently fail to avoid crashing the app because of logging
            console.error('Failed to write to log file:', e);
        }
    }

    info(message: any) {
        const msg = this.formatMessage('INFO', message);
        console.log(msg.trim());
        this.writeToFile(msg);
    }

    warn(message: any) {
        const msg = this.formatMessage('WARN', message);
        console.warn(msg.trim());
        this.writeToFile(msg);
    }

    error(message: any) {
        const msg = this.formatMessage('ERROR', message);
        console.error(msg.trim());
        this.writeToFile(msg);
    }

    getLogPath(): string {
        return this.logFile;
    }
}

export const logger = new Logger();
