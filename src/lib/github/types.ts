export type GitHubRepositoryItem = {
  id: number;
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  license?: {
    key: string;
    name: string;
    spdx_id: string | null;
  } | null;
  created_at: string;
  pushed_at: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  subscribers_count?: number;
  open_issues_count: number;
  archived: boolean;
  fork: boolean;
  default_branch: string;
};

export type GitHubSearchResponse = {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepositoryItem[];
};

export type GitHubReadmeResult = {
  text: string;
  hash: string;
  excerpt: string;
};

export type SearchOptions = {
  query: string;
  sort?: GitHubSearchSort;
  order?: "desc";
  page?: number;
  perPage?: number;
};

export type GitHubSearchProfile =
  | "fresh_repos"
  | "fast_momentum"
  | "established_hot"
  | "old_reactivated"
  | "niche_ai_tools";

export type GitHubSearchSort = "stars" | "updated";

export type GitHubSearchQuerySpec = {
  profile: GitHubSearchProfile;
  query: string;
  sort: GitHubSearchSort;
  order: "desc";
  minStars: number;
};

export type DiscoveredGitHubRepository = {
  item: GitHubRepositoryItem;
  matchedProfiles: GitHubSearchProfile[];
  minStarsMatched: number;
};
