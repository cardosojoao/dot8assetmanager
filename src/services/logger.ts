import * as vscode from 'vscode';
import { TimerManager } from './timer';

export let logger: Logger;

export interface LoggerConfig {
    level: LogLevel;
}

export enum LogLevel {
    Silent = 0,
    Error = 1,
    Warning = 2,
    Info = 3,
    Debug = 4,
    Trace = 5
}

export function loadLoggerConfig(): LoggerConfig {
    const cfg = vscode.workspace.getConfiguration("spriteEngine");

    type LogLevelKey = "silent" | "error" | "warning" | "warn" | "info" | "debug" | "trace";
    const levelMap: Record<LogLevelKey, LogLevel> = {
        silent: LogLevel.Silent,
        error: LogLevel.Error,
        warning: LogLevel.Warning,
        warn: LogLevel.Warning,
        info: LogLevel.Info,
        debug: LogLevel.Debug,
        trace: LogLevel.Trace
    };

    // 🔊 1. Log level
    const levelStr = (cfg.get<string>("logLevel", "info") || "info").toLowerCase();
    
    const level = levelMap[levelStr as LogLevelKey] ?? LogLevel.Info;
    return {
        level : level
    };
}
/////////////////////////////////////////////

export class Logger {
    constructor(
        private router: OutputRouter,
        private filter: LogFilter,
        private timer: TimerManager,
        private config: LoggerConfig
    ) { }

    private format(level: string, msg: string) {
        const ts = new Date().toISOString();
        return `[${ts}][${level}] ${msg}`;
    }

    info(msg: string) {
        this.log(LogLevel.Info, msg);
    }

    warn(msg: string) {
        this.log(LogLevel.Warning, msg);
    }

    error(msg: string) {
        this.log(LogLevel.Error, msg);
    }

    debug(msg: string) {
        this.log(LogLevel.Debug, msg);
    }

    trace(msg: string) {
        this.log(LogLevel.Trace, msg);
    }

    dispose() : void
    {
        this.router.dispose();
    }

    private log(level: LogLevel, msg: string) {
        if (!this.filter.shouldLog(level)) return;

        const line = this.format(LogLevel[level], msg);
        this.router.write(line);
    }
}

export class LogFilter {
    constructor(private config: LoggerConfig) { }

    shouldLog(level: LogLevel): boolean {
        if (level > this.config.level){ return false;}
        return true;
    }
}



export class OutputRouter {
    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel("dot8 asset manager");
    }

    public write(message: string) {
        this.channel.appendLine(message);
    }

    public dispose() : void
    {
        this.channel.dispose();
    }

}



export function initializeLogger(router: OutputRouter, filter: LogFilter, timer: TimerManager, config: LoggerConfig) {
    logger = new Logger(router, filter, timer, config);
}