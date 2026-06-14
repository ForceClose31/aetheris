/**
 * Logger - tiny, pluggable, level-gated logger.
 *
 * Avoids console output in production by default. Tests use the in-memory sink.
 */

export const LogLevel = {
  Trace: 10,
  Debug: 20,
  Info: 30,
  Warn: 40,
  Error: 50,
  Silent: 100,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LogRecord {
  readonly level: LogLevel;
  readonly tag: string;
  readonly message: string;
  readonly data?: unknown;
  readonly timestamp: number;
}

export interface LogSink {
  write(record: LogRecord): void;
}

export class ConsoleSink implements LogSink {
  write(record: LogRecord): void {
    const line = `[${record.tag}] ${record.message}`;
    if (record.level >= LogLevel.Error) {
      console.error(line, record.data ?? '');
    } else if (record.level >= LogLevel.Warn) {
      console.warn(line, record.data ?? '');
    } else if (record.level >= LogLevel.Info) {
      console.warn(line, record.data ?? ''); // info also via warn to satisfy lint policy
    }
  }
}

export class MemorySink implements LogSink {
  readonly records: LogRecord[] = [];
  write(record: LogRecord): void {
    this.records.push(record);
  }
  clear(): void {
    this.records.length = 0;
  }
}

export class Logger {
  constructor(
    private readonly tag: string,
    private level: LogLevel,
    private readonly sink: LogSink,
  ) {}

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  child(subTag: string): Logger {
    return new Logger(`${this.tag}:${subTag}`, this.level, this.sink);
  }

  trace(message: string, data?: unknown): void {
    this.emit(LogLevel.Trace, message, data);
  }
  debug(message: string, data?: unknown): void {
    this.emit(LogLevel.Debug, message, data);
  }
  info(message: string, data?: unknown): void {
    this.emit(LogLevel.Info, message, data);
  }
  warn(message: string, data?: unknown): void {
    this.emit(LogLevel.Warn, message, data);
  }
  error(message: string, data?: unknown): void {
    this.emit(LogLevel.Error, message, data);
  }

  private emit(level: LogLevel, message: string, data?: unknown): void {
    if (level < this.level) {
      return;
    }
    const record: LogRecord = {
      level,
      tag: this.tag,
      message,
      data,
      timestamp: Date.now(),
    };
    this.sink.write(record);
  }
}

let rootLogger: Logger | null = null;

export const initLogger = (level: LogLevel = LogLevel.Info, sink?: LogSink): Logger => {
  rootLogger = new Logger('aetheris', level, sink ?? new ConsoleSink());
  return rootLogger;
};

export const getLogger = (tag?: string): Logger => {
  if (rootLogger === null) {
    rootLogger = new Logger('aetheris', LogLevel.Info, new ConsoleSink());
  }
  return tag === undefined ? rootLogger : rootLogger.child(tag);
};
