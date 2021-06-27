export abstract class AbstractFileError implements Error {
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

export class NotFoundError extends AbstractFileError {
  // #region Properties (1)

  public name = "Not found error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class NotReadableError extends AbstractFileError {
  // #region Properties (1)

  public name = "Not readable error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class NoModificationAllowedError extends AbstractFileError {
  // #region Properties (1)

  public name = "No modification allowed error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class InvalidStateError extends AbstractFileError {
  // #region Properties (1)

  public name = "Invalid state error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class InvalidModificationError extends AbstractFileError {
  // #region Properties (1)

  public name = "Invalid modification error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}

export class PathExistsError extends AbstractFileError {
  // #region Properties (1)

  public name = "Path exists error";

  // #endregion Properties (1)

  // #region Constructors (1)

  constructor(repository: string, path: string, detail?: any) {
    super(repository, path, detail);
  }

  // #endregion Constructors (1)
}
