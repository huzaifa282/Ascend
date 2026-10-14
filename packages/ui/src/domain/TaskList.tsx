import type { ReactNode } from 'react';
import { Card } from '../primitives/Card';
import { QuestRow } from './QuestRow';

export interface TaskListItem {
  id: string;
  title: string;
  time?: string;
  isNow?: boolean;
  done: boolean;
  xp?: number;
}

export interface TaskListProps {
  tasks: TaskListItem[];
  levelingEnabled?: boolean;
  onToggle?: (id: string, done: boolean) => void;
  onAddTask?: () => void;
  emptyState?: ReactNode;
}

/** Today's TaskList card: "N OF M DONE" header, rows, "+ ADD A TASK" (spec 9.2). */
export function TaskList({ tasks, levelingEnabled = true, onToggle, onAddTask, emptyState }: TaskListProps) {
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <Card title="Today" right={<span className="font-mono text-[11px] uppercase tracking-[.1em] text-text-muted">{doneCount} OF {tasks.length} DONE</span>}>
      {tasks.length === 0 && emptyState ? (
        <div className="p-6">{emptyState}</div>
      ) : (
        <div>
          {tasks.map((task) => (
            <QuestRow
              key={task.id}
              title={task.title}
              meta={task.time ? (task.isNow ? undefined : task.time) : undefined}
              done={task.done}
              xp={levelingEnabled ? task.xp : undefined}
              onToggle={onToggle ? (done) => onToggle(task.id, done) : undefined}
              right={task.isNow ? <span className="font-mono text-[11px] text-accent uppercase">NOW</span> : undefined}
            />
          ))}
          {onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="w-full h-14 flex items-center px-3 a-row font-mono text-[11px] uppercase tracking-[.1em] text-text-muted hover:text-text transition-colors duration-base"
            >
              + ADD A TASK
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
