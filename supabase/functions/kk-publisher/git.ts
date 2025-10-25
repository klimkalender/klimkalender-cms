import { Octokit } from "@octokit/rest";
import { encodeBase64 } from "base64";

export class GitService {
  constructor(
    private octokit: Octokit,
    private owner: string,
    private repo: string,
    private branch: string,
  ) {}

  public async listFilesInDirectory(directory: string) {
    const { owner, repo, branch } = this;
    console.dir({ directory, owner, repo, branch }, { depth: null });
    const response = await this.octokit.repos.getContent({
      owner,
      repo,
      path: directory,
      ref: branch,
    });
    return response.data;
  }

  public async commitFilesToBranch(
    commitMessage: string,
    files: { path: string; content: string | Uint8Array | null }[],
  ) {
    const { owner, repo, branch } = this;

    // 1️⃣ Get reference to latest commit on base branch
    const refData = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const baseCommitSha = refData.data.object.sha;

    // 3️⃣ Get the commit tree for the base branch
    const commitData = await this.octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    });
    const baseTreeSha = commitData.data.tree.sha;

    // 4️⃣ Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const blob = file.content
          ? await this.octokit.git.createBlob({
            owner,
            repo,
            content: encodeBase64(file.content),
            encoding: "base64",
          })
          : null;
        const mode:
          | "100644"
          | "100755"
          | "040000"
          | "160000"
          | "120000"
          | undefined = "100644";
        const type: "blob" | "tree" | "commit" | undefined = "blob";
        return {
          path: file.path,
          mode,
          type,
          sha: blob?.data.sha || null,
        };
      }),
    );
    console.dir(blobs, { depth: null });

    // 5️⃣ Create a new tree combining existing repo state + new files
    const newTree = await this.octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: blobs,
    });

    // 6️⃣ Create a commit object
    const newCommit = await this.octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.data.sha,
      parents: [baseCommitSha],
    });

    // 7️⃣ Update the new branch reference to point to the new commit
    await this.octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.data.sha,
    });

    console.log(`✅ Committed ${files.length} files to branch '${branch}'`);
  }
}
