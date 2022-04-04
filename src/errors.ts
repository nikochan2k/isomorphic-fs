import { ErrorLike } from "./core";

interface DOMExceptionType {
  code?: number;
  name: string;
  message: string;
}

/* Use RangeError instead. */
export const IndexSizeError: DOMExceptionType = {
  code: 1,
  name: "IndexSizeError",
  message: "The index is not in the allowed range.",
};

export const HierarchyRequestError: DOMExceptionType = {
  code: 3,
  name: "HierarchyRequestError",
  message: "The operation would yield an incorrect node tree. [DOM]",
};

export const WrongDocumentError: DOMExceptionType = {
  code: 4,
  name: "WrongDocumentError",
  message: "The object is in the wrong document. [DOM]",
};

export const InvalidCharacterError: DOMExceptionType = {
  code: 5,
  name: "InvalidCharacterError",
  message: "The string contains invalid characters.",
};

export const NoModificationAllowedError: DOMExceptionType = {
  code: 7,
  name: "NoModificationAllowedError",
  message: "The string contains invalid characters.",
};

export const NotFoundError: DOMExceptionType = {
  code: 8,
  name: "NotFoundError",
  message: "The object can not be found here.",
};

export const NotSupportedError: DOMExceptionType = {
  code: 9,
  name: "NotSupportedError",
  message: "The operation is not supported.",
};

export const InUseAttributeError: DOMExceptionType = {
  code: 10,
  name: "InUseAttributeError",
  message: "The attribute is in use.",
};

export const InvalidStateError: DOMExceptionType = {
  code: 11,
  name: "InvalidStateError",
  message: "The object is in an invalid state.",
};

export const SyntaxError: DOMExceptionType = {
  code: 12,
  name: "SyntaxError",
  message: "The string did not match the expected pattern.",
};

export const InvalidModificationError: DOMExceptionType = {
  code: 13,
  name: "InvalidModificationError",
  message: "The object can not be modified in this way.",
};

export const NamespaceError: DOMExceptionType = {
  code: 14,
  name: "NamespaceError",
  message: "The operation is not allowed by Namespaces in XML. [XML-NAMES]",
};

/* Use TypeError for invalid arguments, "NotSupportedError" DOMException for unsupported operations, and "NotAllowedError" DOMException for denied requests instead. */
export const InvalidAccessError: DOMExceptionType = {
  code: 15,
  name: "InvalidAccessError",
  message: "The object does not support the operation or argument.",
};

/* Use TypeError instead. */
export const TypeMismatchError: DOMExceptionType = {
  code: 17,
  name: "TypeMismatchError",
  message: "The type of the object does not match the expected type.",
};

export const SecurityError: DOMExceptionType = {
  code: 18,
  name: "SecurityError",
  message: "The operation is insecure.",
};

export const NetworkError: DOMExceptionType = {
  code: 19,
  name: "NetworkError",
  message: "A network error occurred.",
};

export const AbortError: DOMExceptionType = {
  code: 20,
  name: "AbortError",
  message: "The operation was aborted.",
};

export const URLMismatchError: DOMExceptionType = {
  code: 21,
  name: "URLMismatchError",
  message: "The given URL does not match another URL.",
};

export const QuotaExceededError: DOMExceptionType = {
  code: 22,
  name: "QuotaExceededError",
  message: "The quota has been exceeded.",
};

export const TimeoutError: DOMExceptionType = {
  code: 23,
  name: "TimeoutError",
  message: "The operation timed out.",
};

export const InvalidNodeTypeError: DOMExceptionType = {
  code: 24,
  name: "InvalidNodeTypeError",
  message:
    "The supplied node is incorrect or has an incorrect ancestor for this operation.",
};

export const DataCloneError: DOMExceptionType = {
  code: 25,
  name: "DataCloneError",
  message: "The object can not be cloned.",
};

export const EncodingError: DOMExceptionType = {
  name: "EncodingError",
  message: "The encoding operation (either encoded or decoding) failed.",
};

export const NotReadableError: DOMExceptionType = {
  name: "NotReadableError",
  message: "The I/O read operation failed.",
};

export const UnknownError: DOMExceptionType = {
  name: "UnknownError",
  message: "The operation failed for an unknown transient reason.",
};

export const ConstraintError: DOMExceptionType = {
  name: "ConstraintError",
  message:
    "A mutation operation in a transaction failed because a constraint was not satisfied.",
};

export const DataError: DOMExceptionType = {
  name: "DataError",
  message: "Provided data is inadequate.",
};

export const TransactionInactiveError: DOMExceptionType = {
  name: "TransactionInactiveError",
  message:
    "A request was placed against a transaction which is currently not active, or which is finished.",
};

export const ReadOnlyError: DOMExceptionType = {
  name: "ReadOnlyError",
  message: 'The mutating operation was attempted in a "readonly" transaction.',
};

export const VersionError: DOMExceptionType = {
  name: "VersionError",
  message:
    "An attempt was made to open a database using a lower version than the existing version.",
};

export const OperationError: DOMExceptionType = {
  name: "OperationError",
  message: "The operation failed for an operation-specific reason.",
};

export const NotAllowedError: DOMExceptionType = {
  name: "NotAllowedError",
  message:
    "The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.",
};

export const PathExistError: DOMExceptionType = {
  code: 12,
  name: "PathExistError",
  message: "The request file or directry has already existed.",
};

export const domExceptions: DOMExceptionType[] = [
  IndexSizeError,
  HierarchyRequestError,
  WrongDocumentError,
  InvalidCharacterError,
  NoModificationAllowedError,
  NotFoundError,
  NotSupportedError,
  InUseAttributeError,
  InvalidStateError,
  SyntaxError,
  InvalidModificationError,
  NamespaceError,
  InvalidAccessError,
  TypeMismatchError,
  SecurityError,
  NetworkError,
  AbortError,
  URLMismatchError,
  QuotaExceededError,
  TimeoutError,
  InvalidNodeTypeError,
  DataCloneError,
  EncodingError,
  NotReadableError,
  UnknownError,
  ConstraintError,
  DataError,
  TransactionInactiveError,
  ReadOnlyError,
  VersionError,
  OperationError,
  NotAllowedError,
];

export function createError(options: {
  repository: string;
  path: string;
  e?: ErrorLike | string;
  name?: string;
  [key: string]: any; // eslint-disable-line
}): ErrorLike {
  let e = options.e;
  if (isFileSystemError(e)) {
    return e as ErrorLike;
  }

  if (typeof e === "object") {
    if (Object.isFrozen(e) || Object.isSealed(e)) {
      e = { ...e };
    }
  } else {
    e = { message: e };
  }

  let repository = options.repository;
  if (repository.endsWith("/")) {
    repository = repository.substr(0, repository.length - 1);
  }
  if (!repository.startsWith("/")) {
    repository = "/" + repository;
  }
  const path = options.path;
  e["repository"] = repository;
  e["path"] = path;

  const name = options.name;
  if (name) {
    for (const de of domExceptions) {
      if (de.name == name) {
        e.name = name;
        e.code = de.code;
        if (!e.message) {
          e.message = de.message;
        }
        return e;
      }
    }
  }

  return e;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isFileSystemError(e?: any): boolean {
  if (!e) {
    return false;
  }
  // eslint-disable-next-line
  return e["repository"] && e["path"];
}
