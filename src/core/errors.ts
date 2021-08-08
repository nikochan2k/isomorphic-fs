interface DomExceptionData {
  code?: number;
  name: string;
  message: string;
}

/** @deprecated Use RangeError instead. */
export const IndexSizeError: DomExceptionData = {
  code: 1,
  name: "IndexSizeError",
  message: "The index is not in the allowed range.",
};

export const HierarchyRequestError: DomExceptionData = {
  code: 3,
  name: "HierarchyRequestError",
  message: "The operation would yield an incorrect node tree. [DOM]",
};

export const WrongDocumentError: DomExceptionData = {
  code: 4,
  name: "WrongDocumentError",
  message: "The object is in the wrong document. [DOM]",
};

export const InvalidCharacterError: DomExceptionData = {
  code: 5,
  name: "InvalidCharacterError",
  message: "The string contains invalid characters.",
};

export const NoModificationAllowedError: DomExceptionData = {
  code: 7,
  name: "NoModificationAllowedError",
  message: "The string contains invalid characters.",
};

export const NotFoundError: DomExceptionData = {
  code: 8,
  name: "NotFoundError",
  message: "The object can not be found here.",
};

export const NotSupportedError: DomExceptionData = {
  code: 9,
  name: "NotSupportedError",
  message: "The operation is not supported.",
};

export const InUseAttributeError: DomExceptionData = {
  code: 10,
  name: "InUseAttributeError",
  message: "The attribute is in use.",
};

export const InvalidStateError: DomExceptionData = {
  code: 11,
  name: "InvalidStateError",
  message: "The object is in an invalid state.",
};

export const SyntaxError: DomExceptionData = {
  code: 12,
  name: "SyntaxError",
  message: "The string did not match the expected pattern.",
};

export const InvalidModificationError: DomExceptionData = {
  code: 13,
  name: "InvalidModificationError",
  message: "The object can not be modified in this way.",
};

export const NamespaceError: DomExceptionData = {
  code: 14,
  name: "NamespaceError",
  message: "The operation is not allowed by Namespaces in XML. [XML-NAMES]",
};

/** @deprecated Use TypeError for invalid arguments, "NotSupportedError" DOMException for unsupported operations, and "NotAllowedError" DOMException for denied requests instead. */
export const InvalidAccessError: DomExceptionData = {
  code: 15,
  name: "InvalidAccessError",
  message: "The object does not support the operation or argument.",
};

/** @deprecated Use TypeError instead. */
export const TypeMismatchError: DomExceptionData = {
  code: 17,
  name: "TypeMismatchError",
  message: "The type of the object does not match the expected type.",
};

export const SecurityError: DomExceptionData = {
  code: 18,
  name: "SecurityError",
  message: "The operation is insecure.",
};

export const NetworkError: DomExceptionData = {
  code: 19,
  name: "NetworkError",
  message: "A network error occurred.",
};

export const AbortError: DomExceptionData = {
  code: 20,
  name: "AbortError",
  message: "The operation was aborted.",
};

export const URLMismatchError: DomExceptionData = {
  code: 21,
  name: "URLMismatchError",
  message: "The given URL does not match another URL.",
};

export const QuotaExceededError: DomExceptionData = {
  code: 22,
  name: "QuotaExceededError",
  message: "The quota has been exceeded.",
};

export const TimeoutError: DomExceptionData = {
  code: 23,
  name: "TimeoutError",
  message: "The operation timed out.",
};

export const InvalidNodeTypeError: DomExceptionData = {
  code: 24,
  name: "InvalidNodeTypeError",
  message:
    "The supplied node is incorrect or has an incorrect ancestor for this operation.",
};

export const DataCloneError: DomExceptionData = {
  code: 25,
  name: "DataCloneError",
  message: "The object can not be cloned.",
};

export const domExceptions: DomExceptionData[] = [
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
];

export function createDOMException(options: {
  repository: string;
  path: string;
  e?: any;
  code?: number;
}) {
  let repository = options.repository;
  if (repository.endsWith("/")) {
    repository = repository.substr(0, repository.length - 1);
  }
  if (!repository.startsWith("/")) {
    repository = "/" + repository;
  }
  const path = options.path;
  let code = options.code;
  let name: string | undefined;
  let stack: any | undefined;
  let tmp: string;
  const e = options.e;
  if (typeof e === "object") {
    code = e.code;
    name = e.name;
    stack = e.stack;
    tmp = e.message;
  } else {
    tmp = e;
  }
  let message = repository + path;
  if (tmp) {
    message += ": " + tmp;
  }
  if (code && !name) {
    for (const de of domExceptions) {
      if (de.code == code) {
        name = de.name;
        break;
      }
    }
  }
  const exception: {
    name?: string;
    code?: number;
    message: string;
    stack?: string;
  } = {
    name,
    code,
    message,
    stack,
  };
  return exception;
}
