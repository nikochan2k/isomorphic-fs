export const DIR_SEPARATOR = "/";

function getPathParts(path: string) {
  const parts = path.split(DIR_SEPARATOR);
  const pathParts = [];
  for (const part of parts) {
    if (part === "..") {
      // Go up one level.
      if (!pathParts.length) {
        throw Error("Invalid path");
      }
      pathParts.pop();
    } else if (part === ".") {
      // Skip over the current directory.
    } else if (part !== "") {
      // Eliminate sequences of '/'s as well as possible leading/trailing '/'s.
      pathParts.push(part);
    }
  }
  return pathParts;
}

export function getParentPath(path: string) {
  let parts = getPathParts(path);
  if (parts.length <= 1) {
    return DIR_SEPARATOR;
  }
  parts = parts.slice(0, -1);
  return DIR_SEPARATOR + parts.join(DIR_SEPARATOR);
}

export function getName(path: string): string {
  const parts = getPathParts(path);
  if (parts.length === 0) {
    return "";
  }
  return parts[parts.length - 1] as string;
}

export function joinPathes(path1: string, path2: string) {
  const parts1 = getPathParts(path1);
  const parts2 = getPathParts(path2);
  const parts = [...parts1, ...parts2];
  return DIR_SEPARATOR + parts.join(DIR_SEPARATOR);
}

export function normalizePath(path: string) {
  const parts = getPathParts(path);
  return DIR_SEPARATOR + parts.join(DIR_SEPARATOR);
}

export function isIllegalFileName(name: string) {
  return /[\x00-\x1f\x7f-\x9f\\/:*?"<>|]/.test(name);
}
