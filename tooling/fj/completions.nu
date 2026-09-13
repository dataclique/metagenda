# Curated from dotconfig completions.nu at d68a19c.
export def fj-complete [] {
  {
    options: {case_sensitive: false, completion_algorithm: "fuzzy"}
    completions: [
      {value: "help", description: "Show portable fj help"}
      {value: "issue list", description: "List issues"}
      {value: "issue view", description: "View an issue"}
      {value: "pr list", description: "List pull requests"}
      {value: "pr view", description: "View a pull request"}
    ]
  }
}
