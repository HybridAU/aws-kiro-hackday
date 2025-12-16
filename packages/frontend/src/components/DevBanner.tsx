import { useState, useEffect } from 'react';

interface TeamTask {
  person: string;
  task: string;
}

export function DevBanner() {
  const [isOpen, setIsOpen] = useState(true);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dev-status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTasks(data.tasks || []);
        }
      })
      .catch(() => {
        setTasks([
          { person: 'Michael', task: 'TBD' },
          { person: 'Jerome', task: 'fix audio recorder' },
          { person: 'Sam', task: 'TBD' },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-16 right-4 z-50 bg-yellow-400 text-black px-2 py-0.5 rounded text-xs font-medium shadow hover:bg-yellow-300"
      >
        🛠️
      </button>
    );
  }

  return (
    <div className="bg-yellow-100 border-b border-yellow-400 px-3 py-1 text-xs">
      <div className="flex items-center gap-3">
        <span className="text-yellow-700 font-bold">🛠️ DEV</span>
        {loading ? (
          <span className="text-yellow-600">...</span>
        ) : (
          <div className="flex gap-4">
            {tasks.map((item, idx) => (
              <span key={idx} className="text-yellow-700">
                <span className="font-semibold">{item.person}:</span> {item.task}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={() => setIsOpen(false)}
          className="ml-auto text-yellow-500 hover:text-yellow-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
