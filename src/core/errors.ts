export abstract class AbstractFileSystemError implements Error {
  public message: string;
  public abstract name: string;
  public stack?: string;

  constructor(repository: string, path: string, detail: any) {
    if (repository === "/") {
      repository = "";
    }
    this.message = repository + path + ": ";
    if (typeof detail === "object") {
      if (detail.message) {
        this.message += detail.message;
      } else {
        if (detail.stack) {
          this.stack = detail.stack;
          const obj = { ...detail };
          delete obj.stack;
          this.message += JSON.stringify(obj);
        } else {
          this.message += JSON.stringify(detail);
        }
      }
    } else {
      this.message += detail;
    }
  }
}

export class NotFoundError extends AbstractFileSystemError {
  public name = "Not found error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class SecurityError extends AbstractFileSystemError {
  public name = "Security error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class AbortError extends AbstractFileSystemError {
  public name = "Abort error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class NotReadableError extends AbstractFileSystemError {
  public name = "Not readable error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class EncodingError extends AbstractFileSystemError {
  public name = "Encoding error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class NoModificationAllowedError extends AbstractFileSystemError {
  public name = "No modification allowed error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class InvalidStateError extends AbstractFileSystemError {
  public name = "Invalid state error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class SyntaxError extends AbstractFileSystemError {
  public name = "Syntax error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class InvalidModificationError extends AbstractFileSystemError {
  public name = "Invalid modification error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class QuotaExceededError extends AbstractFileSystemError {
  public name = "Quota exceeded error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class TypeMismatchError extends AbstractFileSystemError {
  public name = "Type mismatch error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class PathExistsError extends AbstractFileSystemError {
  public name = "Path exists error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}

export class NotSupportedError extends AbstractFileSystemError {
  public name = "Not supported error";

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }
}
