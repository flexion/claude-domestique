'use strict';

const DEFAULT_PARTITION_SEP = '-';

function resolveBranchNaming({ run, taskBranch, partitionSep } = {}) {
  if (!run) throw new Error('--run is required');
  const resolvedTaskBranch = taskBranch === undefined ? `task/${run}` : taskBranch;
  if (!resolvedTaskBranch) throw new Error('--task-branch is required');
  const resolvedPartitionSep = partitionSep === undefined ? DEFAULT_PARTITION_SEP : partitionSep;
  if (!resolvedPartitionSep) throw new Error('--partition-sep is required');
  if (resolvedPartitionSep.includes('/')) {
    throw new Error('--partition-sep cannot contain "/": git refs are files, and the task branch already exists');
  }
  return { taskBranch: resolvedTaskBranch, partitionSep: resolvedPartitionSep };
}

function partitionBranch({ taskBranch, partitionSep }, partition) {
  return `${taskBranch}${partitionSep}${partition}`;
}

module.exports = {
  DEFAULT_PARTITION_SEP,
  resolveBranchNaming,
  partitionBranch,
};
