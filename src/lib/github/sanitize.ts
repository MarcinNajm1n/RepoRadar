const GITHUB_FULL_NAME_PATTERN = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9._-]{1,100})$/;

export function sanitizeGitHubRepositoryUrl(fullName: unknown) {
  return buildGitHubRepositoryUrl(fullName) ?? "https://github.com/";
}

function buildGitHubRepositoryUrl(fullName: unknown) {
  if (typeof fullName !== "string") {
    return null;
  }

  const match = fullName.match(GITHUB_FULL_NAME_PATTERN);
  return match ? `https://github.com/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}` : null;
}
