export abstract class AbstractFileSystemError implements Error {
  // #region Properties (3)

  public message: string;
  public abstract name: string;
  public stack?: string;

  // #endregion Properties (3)

  // #region Constructors (1)

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

  // #endregion Constructors (1)
}

export class NotFoundError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Not found error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class SecurityError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Security error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class AbortError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Abort error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class NotReadableError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Not readable error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class EncodingError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Encoding error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class NoModificationAllowedError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "No modification allowed error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class InvalidStateError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Invalid state error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class SyntaxError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Syntax error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class InvalidModificationError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Invalid modification error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class QuotaExceededError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Quota exceeded error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class TypeMismatchError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Type mismatch error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class PathExistsError extends AbstractFileSystemError {
  // #region Properties (1)

  public name = "Path exists error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}
