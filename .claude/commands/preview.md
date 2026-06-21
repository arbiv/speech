Generate a clickable preview link for the current speech branch.

Steps:
1. Run `git branch --show-current` to get the current branch name
2. Construct the URL: https://htmlpreview.github.io/?https://github.com/arbiv/speech/blob/BRANCH/index.html
3. Output it as a clickable markdown link in this exact format:

[Preview Speech Games on this branch](URL)
