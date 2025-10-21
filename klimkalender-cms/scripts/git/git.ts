import { Octokit } from "@octokit/rest";
import dotenv from 'dotenv'

dotenv.config({ path: '/workspace/klimkalender-cms/.env.local' })


const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Must have `repo` scope
});

const owner = "klimkalender";
const repo = "klimkalender-site";
const baseBranch = "test";
const newBranch = "feature/add-multiple-files";

const files = [
  { path: "src/hello.txt", content: "Hello from Octokit branch commit!" },
  { path: "src/config.json", content: JSON.stringify({ version: 2 }, null, 2) },
  { path: "docs/README.md", content: "# Example Branch Commit\nCommitted via Octokit" },
];

async function commitToNewBranch() {
  // 1️⃣ Get reference to latest commit on base branch
  const refData = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });
  const baseCommitSha = refData.data.object.sha;

  // 2️⃣ Create a new branch reference
  try {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: baseCommitSha,
    });
    console.log(`🌱 Created new branch: ${newBranch}`);
  } catch (err: any) {
    if (err.status === 422) {
      console.log(`⚠️ Branch '${newBranch}' already exists — continuing...`);
    } else {
      throw err;
    }
  }

  // 3️⃣ Get the commit tree for the base branch
  const commitData = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: baseCommitSha,
  });
  const baseTreeSha = commitData.data.tree.sha;

  // 4️⃣ Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const blob = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString("base64"),
        encoding: "base64",
      });
      const mode: "100644" | "100755" | "040000" | "160000" | "120000" | undefined = '100644';
      const type: "blob" | "tree" | "commit" | undefined = 'blob';
      return {
        path: file.path,
        mode,
        type,
        sha: blob.data.sha,
      };
    })
  );

  // 5️⃣ Create a new tree combining existing repo state + new files
  const newTree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: blobs,
  });

  // 6️⃣ Create a commit object
  const commitMessage = "Add multiple files on new branch";
  const newCommit = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.data.sha,
    parents: [baseCommitSha],
  });

  // 7️⃣ Update the new branch reference to point to the new commit
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${newBranch}`,
    sha: newCommit.data.sha,
  });

  console.log(`✅ Committed ${files.length} files to branch '${newBranch}'`);

  // 8️⃣ (Optional) Create a Pull Request
  const pr = await octokit.pulls.create({
    owner,
    repo,
    head: newBranch,
    base: baseBranch,
    title: "Add multiple files via Octokit",
    body: "This PR was created automatically using Octokit + GitHub API.",
  });

  console.log(`🔀 Pull Request created: ${pr.data.html_url}`);
}

commitToNewBranch().catch(console.error);
