import React from 'react';
import Heading from '@theme/Heading';
import MDXContent from '@theme/MDXContent';
import ChapterProgress from '@site/src/components/ChapterProgress';

const CHAPTER_ITEMS = {
  '01 — Processes & Threads': [
    'Process vs Thread vs Goroutine',
    'PCB, Context Switching, and Kernel',
    'Fork, Exec, Wait, Zombie & Orphan',
    'IPC Mechanisms',
    'Scheduling: FCFS, SJF, RR, Priority',
    'Thread Pools & Concurrency Models',
    'Hands-on: ps, top, strace, /proc',
    'Interview Questions',
  ],
  '02 — CPU Scheduling': [
    'Scheduling algorithms trade-offs',
    'CFS, vruntime, and fairness',
    'Convoy effect and avoidance',
    'Starvation, aging, and nice values',
    'Real-time policies: SCHED_FIFO/RR',
    'Diagnosing CPU contention',
    'EEVDF since kernel 6.6',
  ],
  '03 — Memory Management': [
    'Virtual memory and page tables',
    'TLB and address translation',
    'Demand paging and page faults',
    'LRU and Clock replacement',
    'Thrashing detection and resolution',
    'Internal vs external fragmentation',
    'glibc malloc: brk vs mmap',
    'OOM Killer and oom_score',
  ],
  '04 — Synchronization & Deadlocks': [
    'Race conditions and examples',
    'Mutex vs Semaphore',
    'Spinlock internals',
    'The four Coffman conditions',
    'Deadlock prevention strategies',
    'Deadlock detection and recovery',
    'Debugging deadlocks in production',
  ],
  '05 — File Systems & I/O': [
    'ext4, XFS, Btrfs, ZFS trade-offs',
    'Inodes, indirect blocks, hard links',
    'RAID 0/1/5/10 performance',
    'SSD vs HDD seek time',
    'Blocking, non-blocking, async I/O',
    'epoll, kqueue, select',
    'Zero-copy I/O with sendfile()',
  ],
  '06 — Linux Internals & System Calls': [
    'System call mechanics',
    '/proc and /sys introspection',
    'Signal handling deep dive',
    'OOM killer and cgroups',
    'Namespace isolation',
    'strace, ltrace, perf tools',
    'Container runtime internals',
  ],
};

export default function DocItemContent({ children, className }) {
  return (
    <div className={`markdown ${className || ''}`}>
      <ChapterProgress chapterItems={CHAPTER_ITEMS} />
      <MDXContent>{children}</MDXContent>
    </div>
  );
}
