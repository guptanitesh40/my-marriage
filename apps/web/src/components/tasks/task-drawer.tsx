'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Icon } from '@/components/ui/icon';
import type { Task } from '@/lib/tasks/filters';
import { TaskForm, type TaskChoices } from './task-form';

interface TaskDrawerApi {
  add: () => void;
  edit: (task: Task) => void;
  /** Tells screen readers what changed. */
  announce: (message: string) => void;
}

const TaskDrawerContext = createContext<TaskDrawerApi | null>(null);

/** The page's task drawer, or null on a read-only page, where nothing can be changed. */
export function useTaskDrawer(): TaskDrawerApi | null {
  return useContext(TaskDrawerContext);
}

/**
 * The drawer that adds or changes a task (Stitch "Tasks Management"),
 * once per page. After a save the list is fetched again from the server,
 * with its filters, and the change is announced.
 */
export function TaskDrawer({
  weddingId,
  choices,
  children,
}: {
  weddingId: string;
  choices: TaskChoices;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [announcement, setAnnouncement] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  // A fresh form after each save and for each edit; a closed "add" drawer
  // keeps what was typed.
  const [formKey, setFormKey] = useState(0);

  function show(task: Task | null) {
    setAnnouncement('');
    if (task || editing) setFormKey((key) => key + 1);
    setEditing(task);
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  function saved(title: string) {
    close();
    setFormKey((key) => key + 1);
    setAnnouncement(editing ? `${title} was updated.` : `${title} was added to your tasks.`);
    setEditing(null);
    router.refresh();
  }

  const api: TaskDrawerApi = {
    add: () => show(null),
    edit: (task) => show(task),
    announce: setAnnouncement,
  };

  return (
    <TaskDrawerContext.Provider value={api}>
      {children}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <Drawer
        dialog={dialog}
        titleId="task-drawer-title"
        title={editing ? 'Edit task' : 'Add task'}
        description={
          editing
            ? 'Update the details, change the ceremony or reassign it.'
            : 'Capture what needs to be done. You can fill in the details later.'
        }
      >
        <TaskForm
          key={editing ? `edit-${editing.id}-${formKey}` : `add-${formKey}`}
          weddingId={weddingId}
          task={editing ?? undefined}
          choices={choices}
          onCancel={close}
          onSaved={saved}
        />
      </Drawer>
    </TaskDrawerContext.Provider>
  );
}

/** Opens the page's drawer on a new task. */
export function AddTaskButton({ children }: { children: ReactNode }) {
  const drawer = useTaskDrawer();
  if (!drawer) return null;
  return (
    <button
      type="button"
      onClick={drawer.add}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
    >
      <Icon name="add" className="size-4.5" />
      {children}
    </button>
  );
}
