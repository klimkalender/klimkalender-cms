// deno run --allow-net --allow-env script.ts

import { Octokit } from "https://esm.sh/@octokit/rest";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
if (!GITHUB_TOKEN) {
  console.error("❌ Missing GITHUB_TOKEN env variable");
  Deno.exit(1);
}

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

const owner = "your-username";
const repo = "your-repo";
const baseBranch = "main";
const newBranch = "feature/add-multiple-files";

const files = [
  { path: "src/hello.txt", content: "Hello from Deno + Octokit!" },
  { path: "src/config.json", content: JSON.stringify({ version: 2 }, null, 2) },
  { path: "docs/README.md", content: "# Example Branch Commit\nCommitted via Deno" },
];

async function commitToNewBranch() {
  // 1️⃣ Get the latest commit on the base branch
  const refData = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });
  const baseCommitSha = refData.data.object.sha;

  // 2️⃣ Try to create a new branch
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
    } else throw err;
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
        content: btoa(file.content), // Use btoa() instead of Buffer
        encoding: "base64",
      });
      return {
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.data.sha,
      };
    })
  );

  // 5️⃣ Create a new tree
  const newTree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: blobs,
  });

  // 6️⃣ Create a commit
  const commitMessage = "Add multiple files on new branch (Deno)";
  const newCommit = await octokit.git.createCommit({
    owner,
    repo,
    message: commitMessage,
    tree: newTree.data.sha,
    parents: [baseCommitSha],
  });

  // 7️⃣ Update the new branch ref
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${newBranch}`,
    sha: newCommit.data.sha,
  });

  console.log(`✅ Committed ${files.length} files to branch '${newBranch}'`);

  // 8️⃣ (Optional) Create PR
  const pr = await octokit.pulls.create({
    owner,
    repo,
    head: newBranch,
    base: baseBranch,
    title: "Add multiple files via Deno + Octokit",
    body: "This PR was created automatically using Deno + GitHub API.",
  });

  console.log(`🔀 Pull Request created: ${pr.data.html_url}`);
}

await commitToNewBranch();
