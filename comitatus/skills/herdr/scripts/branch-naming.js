'use strict';

const DEFAULT_PARTITION_SEP = '-';

function partitionSeparator(value) {
  if (value === undefined || value === '') throw new Error('--partition-sep needs a value');
  const separator = String(value);
  if (separator.includes('/')) {
    throw new Error('--partition-sep cannot contain "/": git refs are files, and the task branch already exists');
  }
  if (!/^[-._]+$/.test(separator)) {
    throw new Error('--partition-sep must contain only "-", ".", or "_"');
  }
  return separator;
}

function resolveBranchNaming({ run, taskBranch, partitionSep } = {}) {
  if (!run) throw new Error('--run is required');
  const resolvedTaskBranch = taskBranch === undefined ? `task/${run}` : taskBranch;
  if (!resolvedTaskBranch) throw new Error('--task-branch is required');
  const resolvedPartitionSep = partitionSeparator(
    partitionSep === undefined ? DEFAULT_PARTITION_SEP : partitionSep);
  return { taskBranch: resolvedTaskBranch, partitionSep: resolvedPartitionSep };
}

function partitionBranch({ taskBranch, partitionSep }, partition) {
  return `${taskBranch}${partitionSep}${partition}`;
}

module.exports = {
  DEFAULT_PARTITION_SEP,
  partitionSeparator,
  resolveBranchNaming,
  partitionBranch,
};
