import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { Format } from './formats';
import { FileStatus } from './file-status';

async function run(): Promise<void> {
    const octokit = getOctokit(core.getInput('token', { required: true }));
    const format = core.getInput('format', { required: true }) as Format;

    const { owner, repo } = context.repo;

    if (!Object.values(Format).includes(format)) {
        core.setFailed(`Format must be one of ${Object.values(Format)}, got '${format}'.`);
    }

    const { eventName, payload } = context;

    let base: string | undefined;
    let head: string | undefined;

    switch (eventName) {
        case 'pull_request':
            base = payload.pull_request?.base?.sha;
            head = payload.pull_request?.head?.sha;
            break;
        case 'push':
            base = payload.before;
            head = payload.after;
            break;
        default:
            core.setFailed(`This action only supports pull requests and pushes, ${eventName} events are not supported`);
    }

    // https://docs.github.com/en/rest/commits/commits#compare-two-commits
    const response = await octokit.rest.repos.compareCommitsWithBasehead({
        basehead: `${base}...${head}`,
        owner,
        repo
    });

    if (response.status !== 200) {
        core.setFailed(
            `The GitHub API for comparing the base and head commits for ${eventName} event returned ${response.status}.`
        );
    }

    const { files } = response.data;

    const all = [] as string[],
        added = [] as string[],
        modified = [] as string[],
        removed = [] as string[],
        renamed = [] as string[];

    for (const file of files) {
        const { filename, status } = file;

        if (format === Format.spaceDelimited && filename.includes(' ')) {
            core.setFailed(
                `One of your files includes a space. Consider using a different output format or removing spaces from your filenames.`
            );
        }
        all.push(filename);

        switch (status) {
            case FileStatus.Added:
                added.push(filename);
                break;
            case FileStatus.Modified:
                modified.push(filename);
                break;
            case FileStatus.Removed:
                removed.push(filename);
                break;
            case FileStatus.Renamed:
                renamed.push(filename);
                break;
            default:
                core.setFailed(
                    `One of your files includes an unsupported file status '${status}', expected 'added', 'modified', 'removed', or 'renamed'.`
                );
        }
    }

    let allFormatted: string,
        addedFormatted: string,
        modifiedFormatted: string,
        removedFormatted: string,
        renamedFormatted: string;

    switch (format) {
        case Format.spaceDelimited:
            allFormatted = all.join(' ');
            addedFormatted = added.join(' ');
            modifiedFormatted = modified.join(' ');
            removedFormatted = removed.join(' ');
            renamedFormatted = renamed.join(' ');
            break;
        case Format.csv:
            allFormatted = all.join(',');
            addedFormatted = added.join(',');
            modifiedFormatted = modified.join(',');
            removedFormatted = removed.join(',');
            renamedFormatted = renamed.join(',');
            break;
        case Format.json:
            allFormatted = JSON.stringify(all);
            addedFormatted = JSON.stringify(added);
            modifiedFormatted = JSON.stringify(modified);
            removedFormatted = JSON.stringify(removed);
            renamedFormatted = JSON.stringify(renamed);
            break;
    }

    // Log the output values.
    core.info(`All: ${allFormatted}`);
    core.info(`Added: ${addedFormatted}`);
    core.info(`Modified: ${modifiedFormatted}`);
    core.info(`Removed: ${removedFormatted}`);
    core.info(`Renamed: ${renamedFormatted}`);

    core.setOutput('all', allFormatted);
    core.setOutput('added', addedFormatted);
    core.setOutput('modified', modifiedFormatted);
    core.setOutput('removed', removedFormatted);
    core.setOutput('renamed', renamedFormatted);
}

run().catch(error => core.setFailed(error.message));
