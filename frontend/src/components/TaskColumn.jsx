import { useState, useRef } from 'react';
import { Tag, User, Trash2, Pencil } from 'lucide-react';

const TAG_STYLES = {
  Frontend: 'bg-sky-50 text-sky-700 border-sky-200',
  Backend: 'bg-purple-50 text-purple-700 border-purple-200',
  Database: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Documentation: 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_CONFIG = {
  todo: {
    accent: 'bg-slate-400',
    countBadge: 'bg-slate-200 text-slate-700',
    dot: 'bg-slate-400',
  },
  'in-progress': {
    accent: 'bg-amber-400',
    countBadge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
  },
  done: {
    accent: 'bg-emerald-500',
    countBadge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
  },
};

function TaskColumn({
  title,
  statusKey,
  count,
  tasks,
  onTaskDrop,
  canDelete = false,
  onDeleteTask,
  canEdit = false,
  onSelectTask,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isDraggingRef = useRef(false);

  const handleDragStart = (e, taskId) => {
    isDraggingRef.current = true;
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onTaskDrop(Number(taskId), statusKey);
    }
  };

  const config = STATUS_CONFIG[statusKey] || STATUS_CONFIG.todo;

  return (
    <div className="flex flex-col flex-1 min-w-[300px]">
      {/* Column Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col h-full rounded-2xl p-4 bg-slate-100/80 border transition-colors duration-150 ${
          isDragOver
            ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/40'
            : 'border-slate-200/80'
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
            <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.countBadge}`}
          >
            {count}
          </span>
        </div>

        {/* Tasks Card Stream */}
        <div className="flex flex-col gap-2.5 flex-grow min-h-[420px]">
          {tasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
              <p className="text-xs font-medium">Drop tasks here</p>
            </div>
          ) : (
            tasks.map((task) => {
              const tagStyle =
                TAG_STYLES[task.tag] || 'bg-slate-100 text-slate-700 border-slate-200';

              return (
                <div
                  key={task.id}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (!isDraggingRef.current && canEdit && onSelectTask) {
                      onSelectTask(task);
                    }
                  }}
                  className={`group relative bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all duration-150 select-none ${
                    canEdit ? 'cursor-pointer hover:border-indigo-300' : 'cursor-grab active:cursor-grabbing hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-semibold text-sm text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.priority && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            task.priority === 'High'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : task.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectTask) onSelectTask(task);
                          }}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                          title="Edit task details (Faculty/Lead only)"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteTask) onDeleteTask(task.id, task.title);
                          }}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Delete task (Faculty/Lead only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] border ${tagStyle}`}
                    >
                      <Tag className="w-3 h-3" />
                      {task.tag}
                    </span>

                    {task.assignee_name || task.assignee ? (
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[100px]">{task.assignee_name || task.assignee}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskColumn;