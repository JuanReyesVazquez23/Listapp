import { AppError } from '@/lib/errors';

export interface SerialQueueOptions {
  timeoutMs?: number;
  onTimeout?: (error: AppError) => void;
}

/**
 * Serializa todas las operaciones de base de datos.
 *
 * Un fallo no rompe la cola. Si una tarea supera el timeout, la cola se marca
 * como rota y no se libera: la tarea anterior podría seguir viva y escribir
 * sobre un handle que ya no controlamos.
 */
export class SerialQueue {
  private tail: Promise<void> = Promise.resolve();
  private active = false;
  private broken = false;
  private readonly timeoutMs: number;
  private readonly onTimeout?: (error: AppError) => void;
  private readonly waiters = new Set<(error: AppError) => void>();

  constructor(options: SerialQueueOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.onTimeout = options.onTimeout;
  }

  get isActive(): boolean {
    return this.active;
  }

  get isBroken(): boolean {
    return this.broken;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.broken) {
      return Promise.reject(new AppError('DB_BROKEN', 'La conexión no es fiable. Reinicia la app.'));
    }

    let markStarted!: () => void;
    let markStartFailed!: (error: AppError) => void;
    const started = new Promise<void>((resolve, reject) => {
      markStarted = resolve;
      markStartFailed = reject;
    });

    const waiter = (error: AppError) => markStartFailed(error);
    this.waiters.add(waiter);

    const taskPromise = this.tail.then(() => {
      this.waiters.delete(waiter);
      markStarted();
      this.active = true;
      return task();
    });

    this.tail = taskPromise.then(
      () => {
        this.active = false;
      },
      () => {
        this.active = false;
      },
    );

    return this.withTimeout(taskPromise, started);
  }

  markBroken(): void {
    if (this.broken) {
      return;
    }

    this.broken = true;
    const error = new AppError('DB_BROKEN', 'La conexión no es fiable. Reinicia la app.');
    for (const waiter of this.waiters) {
      waiter(error);
    }
    this.waiters.clear();
  }

  private async withTimeout<T>(taskPromise: Promise<T>, started: Promise<void>): Promise<T> {
    await started;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new AppError('DB_TIMEOUT', 'La operación de base de datos tardó demasiado.');
        this.markBroken();
        this.onTimeout?.(error);
        reject(error);
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([taskPromise, timeout]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }
}
